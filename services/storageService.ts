
import { TrackItem, HistoryItem } from '../types';

const STORAGE_KEY = 'trackwhat_items_v3';
const LEGACY_STORAGE_KEY = 'trackwhat_items_v2';

const normalizeHistoryItem = (
  itemId: string,
  entry: HistoryItem,
  isLegacy: boolean
): HistoryItem => ({
  ...entry,
  matchId: typeof entry.matchId === 'undefined' ? itemId : entry.matchId,
  candidates: entry.candidates ?? undefined,
  confidenceHint: isLegacy ? (entry.confidenceHint ?? 'legacy') : entry.confidenceHint,
  whyNotSecond: entry.whyNotSecond,
  isEdgeCase: entry.isEdgeCase ?? false,
  action: entry.action ?? null
});

const normalizeTrackItem = (item: TrackItem, isLegacy: boolean): TrackItem => ({
  ...item,
  keywords: item.keywords ?? [],
  doList: item.doList ?? [],
  dontList: item.dontList ?? [],
  tags: item.tags ?? [],
  clientName: item.clientName ?? '',
  billable: item.billable ?? false,
  parentId: item.parentId,
  ruleHints: item.ruleHints ?? { keywords: [], windowTitleHints: [], urlHints: [] },
  history: (item.history ?? []).map(entry => normalizeHistoryItem(item.id, entry, isLegacy)),
});

export const loadItems = (): TrackItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const normalized = parsed.map((item: TrackItem) => normalizeTrackItem(item, false));
      if (!normalized.find((i: TrackItem) => i.id === 'unknown')) {
          normalized.unshift(getUnknownBucket());
      }
      return normalized;
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = parsed.map((item: TrackItem) => normalizeTrackItem(item, true));
      if (!migrated.find((i: TrackItem) => i.id === 'unknown')) {
          migrated.unshift(getUnknownBucket());
      }
      saveItems(migrated);
      return migrated;
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
  keywords: [],
  doList: [],
  dontList: [],
  tags: [],
  clientName: '',
  billable: false,
  ruleHints: { keywords: [], windowTitleHints: [], urlHints: [] },
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
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.location.reload();
};
