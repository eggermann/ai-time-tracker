# TrackWhat: Precision + Enterprise Spec (v1)

## Summary
This spec converts the current browser-based TrackWhat into a high-precision, privacy-aware context tracker that scales from personal users to enterprise teams. It is anchored to the existing app: screen capture loop, prompt-based classifier (`analyzeScreenshotContext`), Unknown bucket, Solo Mode lock, timeline export, and client-side key handling.

## Goals
- Precision: fewer Unknowns, fewer wrong assignments, clear explainability.
- Trust: explicit privacy modes, policy hooks, auditability.
- Workflow value: reporting, exports, integrations readiness.

## Non-goals (for Milestone 1)
- No backend or SSO in M1.
- No real embeddings or clustering in M1.
- No storage beyond local browser storage in M1.

## Product Modes
- Personal / Local-first: all data in browser, bring-your-own key.
- Pro / Sync: optional account with encrypted sync across devices.
- Enterprise: SSO, org policies, retention, audit, AI routing rules.

## Milestone 1: Precision v1 (no new infra)

### Data Model Changes
Target storage key: `trackwhat_items_v3` (migrate from `trackwhat_items_v2`).

#### types.ts additions (core)
```
interface TrackItem {
  id: string;
  name: string;
  description: string;
  notes?: string;
  keywords?: string[];      // hard positive signals
  doList?: string[];        // "this is" statements
  dontList?: string[];      // "this is not" statements
  tags?: string[];
  clientName?: string;
  billable?: boolean;
  parentId?: string;        // for hierarchy
  ruleHints?: RuleHints;    // optional rules layer
  totalTime: number;
  detectCount: number;
  lastActive: number;
  history: HistoryItem[];
  isUnknown?: boolean;
}

interface HistoryItem {
  timestamp: number;
  reason: string;           // 1-sentence description of screen
  duration: number;
  matchId?: string | null;
  candidates?: Candidate[]; // top 2 candidates
  confidenceHint?: string;  // human-readable, e.g. "strong", "weak"
  whyNotSecond?: string;    // short explanation
  isEdgeCase?: boolean;     // user-flagged training example
}

interface Candidate {
  id: string;
  confidenceHint: string;   // "high", "medium", "low"
}

interface RuleHints {
  keywords?: string[];      // domain, tools, client names
  windowTitleHints?: string[]; // optional future use
  urlHints?: string[];      // optional future use
}
```

### Migration Plan (localStorage)
- On load: if `trackwhat_items_v3` exists, load it.
- Else, load `trackwhat_items_v2` and migrate:
  - Default new fields to empty arrays or false.
  - `HistoryItem` gains new optional fields set to `undefined`.
  - Write migrated data back to `trackwhat_items_v3`.
- Keep `trackwhat_items_v2` intact as a fallback until next release.

### Classifier Improvements (prompt-based)
#### Training example selection
Replace "last 6 unique reasons" with:
- 2x most frequent unique reasons (representative)
- 2x most recent unique reasons
- 2x edge cases (user flagged) when available
- Deduplicate and cap to 6 total

#### Structured project definition
Include in prompt:
- Keywords
- Do / Don't list
- Notes
- Optional rule hints

#### Response schema
Extend response to include top-2 candidates and short explanation:
```
{
  "matchId": "project-id" | null,
  "reason": "1 sentence description",
  "candidates": [
    {"id": "project-id-1", "confidenceHint": "high"},
    {"id": "project-id-2", "confidenceHint": "medium"}
  ],
  "whyNotSecond": "short reason",
  "confidenceHint": "strong|medium|weak"
}
```

### Explainability
- Store the classifier output in `HistoryItem` for later review.
- UI surfaces "Why this project?" with reason + candidates + whyNotSecond.

### Review Center (new UI screen)
Show:
- Unknown items
- Low-confidence items (candidate gap too small)
- Edge-case suggestions (user flagged or repeated confusion)

Actions:
- One-click reassign
- Mark as edge-case (adds to training pool)
- Create new project from a history item

### Reliability Improvements
- Adaptive scan interval:
  - If last N results match same project, slow scan interval.
  - If activity changes or unknowns spike, speed up interval.
- Backoff on API errors:
  - Exponential backoff and a short cooldown after repeated failures.
- Rate-limit:
  - per minute and per hour caps; log time as Unknown if exceeded.

## Milestone 2: Hybrid Embeddings (big precision leap)

### Embedding Index Schema
- Store in IndexedDB.
- Index consists of:
```
interface EmbeddingDocument {
  id: string;
  projectId: string;
  text: string; // description, keywords, examples
  vector: number[];
  type: "project" | "example" | "unknown";
  timestamp?: number;
}
```

### Matching Strategy
- AI produces 1-sentence description only.
- Embed description and compare cosine similarity against project vectors.
- Thresholds:
  - if top < T -> Unknown
  - if (top - second) < gap -> Needs Review
  - else -> match top

## Milestone 3: Pro Sync
- Account system + encrypted sync.
- Multi-device history.

## Milestone 4: Enterprise
- Backend proxy for AI calls with policy controls.
- SSO, admin policies, audit, retention windows.
- Optional no-screenshot-out / OCR-only modes.

## Privacy Modes (foundation)
- No screenshots leave device (future local model).
- Text-only (OCR local, send only text).
- Redaction (blur or mask on client before send).
- Promote Solo Mode as privacy-first focus mode.

## Exports & Reporting
- CSV + JSON export (baseline)
- Invoice-ready export (client, rate, totals)
- Daily/weekly summary reports
- Change log for edits (audit trail)

## Open Questions
- Preferred storage for audit logs in M2+ (IndexedDB vs sync backend)?
- Should low-confidence review be automatic or user-triggered?
- Desired default thresholds for "Unknown" and "Needs Review"?
