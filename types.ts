
export interface HistoryItem {
  timestamp: number;
  reason: string;
  duration: number; 
  matchId?: string | null;
  candidates?: Candidate[];
  confidenceHint?: string;
  whyNotSecond?: string;
  isEdgeCase?: boolean;
  action?: string | null;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TrackItem {
  id: string;
  name: string;
  description: string;
  notes?: string;
  keywords?: string[];
  doList?: string[];
  dontList?: string[];
  tags?: string[];
  clientName?: string;
  billable?: boolean;
  parentId?: string;
  ruleHints?: RuleHints;
  todos?: TodoItem[];
  totalTime: number; 
  detectCount: number;
  lastActive: number; 
  history: HistoryItem[];
  isUnknown?: boolean;
}

export interface Candidate {
  id: string;
  confidenceHint: string;
}

export interface RuleHints {
  keywords?: string[];
  windowTitleHints?: string[];
  urlHints?: string[];
}

export interface VectorDocument {
  text: string;
  metadata: {
    projectId: string;
    type: 'project' | 'screenshotObservation';
    timestamp?: number;
  };
}

export interface AnalysisResult {
  matchId: string | null;
  reason: string;
  candidates?: Candidate[];
  confidenceHint?: string;
  whyNotSecond?: string;
  action?: string | null;
}
