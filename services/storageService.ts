
import { TrackItem } from '../types';

const STORAGE_KEY = 'trackwhat_items_v2';

export const loadItems = (): TrackItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure the unknown bucket always exists even if deleted from storage
      if (!parsed.find((i: TrackItem) => i.id === 'unknown')) {
          parsed.unshift(getUnknownBucket());
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load items", e);
  }
  
  return [getUnknownBucket()];
};

const getUnknownBucket = (): TrackItem => ({
  id: 'unknown',
  name: 'Unknown / Idle',
  description: 'Any activity that does not match specific projects. General browsing, desktop, or unrecognized apps.',
  totalTime: 0,
  detectCount: 0,
  lastActive: 0,
  history: [],
  todos: [],
  isUnknown: true
});

export const saveItems = (items: TrackItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save items", e);
  }
};

export const clearLocalStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};
