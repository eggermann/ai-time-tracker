import { GoogleGenAI, Type } from "@google/genai";
import { TrackItem, AnalysisResult } from '../types';

let aiInstance: GoogleGenAI | null = null;

const getGeminiApiKey = (): string | undefined => {
  const fromViteEnv =
    (import.meta as any)?.env?.VITE_GEMINI_API_KEY ??
    (import.meta as any)?.env?.GEMINI_API_KEY ??
    (import.meta as any)?.env?.VITE_API_KEY ??
    (import.meta as any)?.env?.API_KEY;

  const fromDefine =
    typeof process !== "undefined"
      ? (process.env?.GEMINI_API_KEY ?? process.env?.API_KEY)
      : undefined;

  return (fromViteEnv ?? fromDefine) || undefined;
};

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

// Simulate Vector DB Semantic Search using Gemini's context window
export const analyzeScreenshotContext = async (
  base64Image: string,
  trackItems: TrackItem[]
): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview"; 

  const knownContexts = trackItems
    .filter(item => !item.isUnknown)
    .map(item => `- ID: "${item.id}"\n  Name: "${item.name}"\n  Context Definition: "${item.description}"`)
    .join("\n") || "No specific track items defined yet.";

  const prompt = `
    You are a semantic vector classifier. I will provide a screenshot of a user's screen.

    Here are the known Track Items (projects/contexts) the user is tracking:
    ${knownContexts}

    Instructions:
    1. First, purely describe what is visible on the screen and what the user is doing in 1 short sentence (e.g., "User is editing React components in VS Code", "Browsing a recipe on a cooking website", "Watching a tutorial on YouTube").
    2. Then, determine if this activity strictly matches one of the provided Track Items.
    3. If there is a strong match, set 'matchId' to that item's ID.
    4. If there is NO match (or no Track Items are defined), set 'matchId' to null.
    5. Always return the description from step 1 as the 'reason'.

    Return JSON format only.
  `;

  try {
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
            reason: { type: Type.STRING }
          },
          required: ["reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      matchId: result.matchId || null,
      reason: result.reason || "Unknown activity detected"
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { matchId: null, reason: "Analysis failed" };
  }
};
