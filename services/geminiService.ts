import { GoogleGenAI, Type } from "@google/genai";
import { TrackItem, AnalysisResult } from '../types';

let aiInstance: GoogleGenAI | null = null;

const getEnvValue = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const fromViteEnv = (import.meta as any)?.env?.[key];
    const fromDefine =
      typeof process !== "undefined" ? (process.env as any)?.[key] : undefined;
    const value = fromViteEnv ?? fromDefine;
    if (value) return value;
  }
  return undefined;
};

export type AiProvider = "gemini" | "openai";

const getAiProvider = (): AiProvider => {
  const rawProvider =
    getEnvValue(["VITE_AI_PROVIDER", "AI_PROVIDER"]) ?? "gemini";
  return rawProvider.toLowerCase() === "openai" ? "openai" : "gemini";
};

const getGeminiApiKey = (): string | undefined =>
  getEnvValue([
    "VITE_GEMINI_API_KEY",
    "GEMINI_API_KEY",
    "VITE_API_KEY",
    "API_KEY",
  ]);

const getOpenAiApiKey = (): string | undefined =>
  getEnvValue([
    "VITE_OPENAI_API_KEY",
    "OPENAI_API_KEY",
  ]);

const getGeminiModel = (): string =>
  getEnvValue(["VITE_GEMINI_MODEL", "GEMINI_MODEL"]) ??
  "gemini-3-flash-preview";

const getOpenAiModel = (): string =>
  getEnvValue(["VITE_OPENAI_MODEL", "OPENAI_MODEL"]) ?? "gpt-4o-mini";

const getAI = () => {
  if (!aiInstance) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        "Missing Gemini API key. Set GEMINI_API_KEY (or VITE_GEMINI_API_KEY) in .env.local and restart the dev server."
      );
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const isUsefulTrainingReason = (reason: string) => {
  const ignoreList = new Set([
    "Analysis failed",
    "Unknown activity detected",
    "Analyzing...",
    "Rate limit reached",
  ]);
  if (!reason) return false;
  if (ignoreList.has(reason)) return false;
  if (reason.trim().length < 12) return false;
  return true;
};

const getTrainingExamples = (item: TrackItem, maxExamples: number) => {
  const seen = new Set<string>();
  const recent: string[] = [];
  const edgeCases: string[] = [];
  const counts = new Map<string, number>();

  for (const entry of item.history) {
    const reason = (entry?.reason ?? "").trim();
    if (!isUsefulTrainingReason(reason)) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  const mostFrequent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => reason)
    .slice(0, 2);

  for (const entry of [...item.history].reverse()) {
    const reason = (entry?.reason ?? "").trim();
    if (!isUsefulTrainingReason(reason)) continue;
    if (!recent.includes(reason)) {
      recent.push(reason);
    }
    if (entry?.isEdgeCase && !edgeCases.includes(reason)) {
      edgeCases.push(reason);
    }
    if (recent.length >= 2 && edgeCases.length >= 2) break;
  }

  const combined = [...mostFrequent, ...recent, ...edgeCases];
  const examples: string[] = [];
  for (const reason of combined) {
    if (seen.has(reason)) continue;
    seen.add(reason);
    examples.push(reason);
    if (examples.length >= maxExamples) break;
  }
  return examples;
};

const parseJsonResponse = (text?: string | null) => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const normalizeAnalysisResult = (
  result: any,
  trackItems: TrackItem[]
): AnalysisResult => {
  const allowedIds = new Set(
    trackItems.filter(item => !item.isUnknown).map(item => item.id)
  );
  const parsedMatchId = typeof result?.matchId === "string" ? result.matchId : null;
  const matchId = parsedMatchId && allowedIds.has(parsedMatchId) ? parsedMatchId : null;
  const candidates = Array.isArray(result?.candidates)
    ? result.candidates
        .filter((candidate: any) => typeof candidate?.id === "string")
        .map((candidate: any) => ({
          id: candidate.id,
          confidenceHint:
            typeof candidate.confidenceHint === "string"
              ? candidate.confidenceHint
              : "unknown",
        }))
        .filter(candidate => allowedIds.has(candidate.id))
        .slice(0, 2)
    : undefined;
  return {
    matchId,
    reason:
      typeof result?.reason === "string" && result.reason.trim()
        ? result.reason
        : "Unknown activity detected",
    candidates: candidates && candidates.length ? candidates : undefined,
    confidenceHint:
      typeof result?.confidenceHint === "string"
        ? result.confidenceHint
        : undefined,
    whyNotSecond:
      typeof result?.whyNotSecond === "string" ? result.whyNotSecond : undefined,
    action:
      typeof result?.action === "string" && result.action.trim()
        ? result.action
        : null,
  };
};

const buildPrompt = (definedTracks: string) => `
    You are an expert developer's agent. Observe the screen and suggest the next logical code change or bug fix. You also act as a semantic vector classifier. I will provide a screenshot of a user's screen.

    Here are the known Track Items (projects/contexts) the user is tracking:
    ${definedTracks}

    Instructions:
    1. First, purely describe what is visible on the screen and what the user is doing in 1 short sentence (e.g., "User is editing React components in VS Code", "Browsing a recipe on a cooking website", "Watching a tutorial on YouTube").
    2. Compare the screenshot against each Track Item using BOTH the Context Definition and the Vector DB examples.
    3. Only set 'matchId' if the match is STRONG (high confidence and clear visual cues). If it is only medium/weak/ambiguous, set 'matchId' to null.
       - IMPORTANT: Many activities happen "in a browser". Do NOT match a track just because the browser is open.
       - If the best match is not clearly stronger than the second-best, set 'matchId' to null.
    4. If there is NO strong match (or no Track Items are defined), set 'matchId' to null.
    5. Always set 'reason' to the description from step 1.
    6. Provide the top 2 candidates in 'candidates' with a short confidence hint ("high", "medium", "low").
    7. Set 'confidenceHint' to "strong", "medium", or "weak" for the final match.
    8. If you provided 2 candidates, include 'whyNotSecond' in 1 short sentence.
    9. If you can suggest a concrete code change or command based on what's on screen, set 'action' to a short, specific suggestion. Otherwise set 'action' to null.

    Return JSON format only.
  `;

const analyzeWithGemini = async (
  base64Image: string,
  prompt: string,
  trackItems: TrackItem[]
): Promise<AnalysisResult> => {
  const model = getGeminiModel();

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchId: { type: Type.STRING, nullable: true },
          reason: { type: Type.STRING },
          confidenceHint: { type: Type.STRING },
          whyNotSecond: { type: Type.STRING },
          action: { type: Type.STRING, nullable: true },
          candidates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                confidenceHint: { type: Type.STRING }
              },
              required: ["id", "confidenceHint"]
            }
          }
        },
        required: ["reason"]
      }
    }
  });

  const result = parseJsonResponse(response.text);
  return normalizeAnalysisResult(result, trackItems);
};

const analyzeWithOpenAI = async (
  base64Image: string,
  prompt: string,
  trackItems: TrackItem[]
): Promise<AnalysisResult> => {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key. Set OPENAI_API_KEY (or VITE_OPENAI_API_KEY) in .env.local and restart the dev server."
    );
  }

  const model = getOpenAiModel();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert developer's agent. Observe the screen and suggest the next logical code change or bug fix. You also act as a semantic vector classifier.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const result = parseJsonResponse(content);
  return normalizeAnalysisResult(result, trackItems);
};

// Simulate Vector DB Semantic Search using an AI model's context window
export const analyzeScreenshotContext = async (
  base64Image: string,
  trackItems: TrackItem[],
  providerOverride?: AiProvider
): Promise<AnalysisResult> => {
  const definedTracks = trackItems
    .filter(item => !item.isUnknown)
    .map(item => {
      const examples = getTrainingExamples(item, 6);
      const notes = item.notes?.trim();
      const notesBlock = notes ? `\n  Notes (extra definition): ${notes}` : "";
      const keywordsBlock = item.keywords?.length
        ? `\n  Keywords: ${item.keywords.join(", ")}`
        : "";
      const doBlock = item.doList?.length
        ? `\n  Do: ${item.doList.join("; ")}`
        : "";
      const dontBlock = item.dontList?.length
        ? `\n  Don't: ${item.dontList.join("; ")}`
        : "";
      const ruleHintsBlock = item.ruleHints?.keywords?.length
        ? `\n  Rule Hints: ${item.ruleHints.keywords.join(", ")}`
        : "";
      const examplesBlock = examples.length
        ? `\n  Vector DB examples (labeled for this track):\n${examples.map(ex => `    - ${ex}`).join("\n")}`
        : "";

      return `- ID: "${item.id}"
  Name: "${item.name}"
  Context Definition: "${item.description}"${notesBlock}${keywordsBlock}${doBlock}${dontBlock}${ruleHintsBlock}${examplesBlock}`;
    })
    .join("\n\n") || "No specific track items defined yet.";

  const prompt = buildPrompt(definedTracks);
  const provider = providerOverride ?? getAiProvider();

  try {
    if (provider === "openai") {
      return await analyzeWithOpenAI(base64Image, prompt, trackItems);
    }
    return await analyzeWithGemini(base64Image, prompt, trackItems);
  } catch (error) {
    console.error(
      `${provider === "openai" ? "OpenAI" : "Gemini"} Analysis Error:`,
      error
    );
    return { matchId: null, reason: "Analysis failed" };
  }
};
