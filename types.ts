
export interface HistoryItem {
  timestamp: number;
  reason: string;
  duration: number; // Duration of this specific interval in seconds
}

export interface TrackItem {
  id: string;
  name: string;
  description: string;
  totalTime: number; // in seconds
  detectCount: number;
  lastActive: number; // timestamp
  history: HistoryItem[];
  isUnknown?: boolean;
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
}
