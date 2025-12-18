import { TrackItem } from '../types';

const STORAGE_KEY = 'trackwhat_items_v1';

export const loadItems = (): TrackItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load items", e);
  }
  
  // Default Initial State
  return [
    {
      id: 'unknown',
      name: 'Unknown / Idle',
      description: 'Any activity that does not match specific projects. General browsing, desktop, or unrecognized apps.',
      totalTime: 0,
      detectCount: 0,
      lastActive: 0,
      history: [],
      isUnknown: true
    }
  ];
};

export const saveItems = (items: TrackItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save items", e);
  }
};
