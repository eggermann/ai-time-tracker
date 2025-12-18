
export interface HistoryItem {
  timestamp: number;
  reason: string;
  duration: number; 
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
  todos?: TodoItem[];
  totalTime: number; 
  detectCount: number;
  lastActive: number; 
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
