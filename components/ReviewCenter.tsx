import React, { useMemo } from 'react';
import { AlertTriangle, Sparkles, Star } from 'lucide-react';
import { TrackItem } from '../types';

interface Props {
  items: TrackItem[];
  onMoveHistoryItem: (itemId: string, historyIndex: number, targetItemId: string) => void;
  onCreateFromHistory: (reason: string) => void;
  onToggleEdgeCase: (itemId: string, historyIndex: number) => void;
}

type ReviewEntry = {
  itemId: string;
  historyIndex: number;
  history: TrackItem['history'][number];
  projectName: string;
  isUnknown: boolean;
  isLowConfidence: boolean;
};

const isLowConfidenceEntry = (item: TrackItem, entry: TrackItem['history'][number]) => {
  const confidence = (entry.confidenceHint ?? '').toLowerCase();
  if (confidence === 'legacy' || confidence === 'manual' || confidence === 'locked') return false;
  if (!entry.matchId) return true;
  if (!confidence) return false;
  return confidence !== 'strong';
};

const isReviewableReason = (reason: string) => {
  const ignoreList = new Set([
    'Analysis failed',
    'Analyzing...',
    'Rate limit reached',
  ]);
  return reason ? !ignoreList.has(reason) : false;
};

export const ReviewCenter: React.FC<Props> = ({
  items,
  onMoveHistoryItem,
  onCreateFromHistory,
  onToggleEdgeCase,
}) => {
  const contexts = useMemo(
    () => items.map(item => ({ id: item.id, name: item.name })),
    [items]
  );

  const idToName = useMemo(
    () => new Map(contexts.map(context => [context.id, context.name])),
    [contexts]
  );

  const entries = useMemo<ReviewEntry[]>(() => {
    return items
      .flatMap(item =>
        item.history.map((history, historyIndex) => ({
          itemId: item.id,
          historyIndex,
          history,
          projectName: item.name,
          isUnknown: !!item.isUnknown,
          isLowConfidence: !item.isUnknown && isLowConfidenceEntry(item, history),
        }))
      )
      .filter(entry => isReviewableReason(entry.history.reason))
      .filter(entry => entry.isUnknown || entry.isLowConfidence)
      .sort((a, b) => b.history.timestamp - a.history.timestamp);
  }, [items]);

  const unknownEntries = entries.filter(entry => entry.isUnknown);
  const lowConfidenceEntries = entries.filter(entry => !entry.isUnknown);

  const renderEntry = (entry: ReviewEntry) => {
    const { history } = entry;
    const candidates = history.candidates ?? [];
    const confidence = history.confidenceHint ?? 'unknown';

    return (
      <div key={`${entry.itemId}-${entry.historyIndex}`} className="border border-cyber-gray rounded-xl p-4 bg-black/30">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold ${entry.isUnknown ? 'text-gray-400' : 'text-cyber-accent'}`}>
                {entry.projectName}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                {entry.isUnknown ? 'unknown' : confidence}
              </span>
              {history.isEdgeCase && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyber-accent text-black">
                  edge case
                </span>
              )}
            </div>
            <p className="text-sm text-gray-200 break-words">{history.reason}</p>

            {(candidates.length > 0 || history.whyNotSecond) && (
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                {candidates.length > 0 && (
                  <div>
                    Candidates: {candidates
                      .map(candidate => `${idToName.get(candidate.id) ?? candidate.id} (${candidate.confidenceHint})`)
                      .join(', ')}
                  </div>
                )}
                {history.whyNotSecond && <div>Why not second: {history.whyNotSecond}</div>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onToggleEdgeCase(entry.itemId, entry.historyIndex)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border ${history.isEdgeCase ? 'border-cyber-accent text-cyber-accent' : 'border-cyber-gray text-gray-400 hover:text-white'}`}
            >
              <Star size={12} />
              {history.isEdgeCase ? 'Edge On' : 'Edge Case'}
            </button>

            {entry.isUnknown && (
              <button
                onClick={() => onCreateFromHistory(history.reason)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border border-cyber-accent text-cyber-accent hover:text-white"
              >
                <Sparkles size={12} />
                New Track
              </button>
            )}

            <div className="relative">
              <select
                className="bg-black/60 border border-cyber-gray rounded px-2 py-1 text-xs font-mono text-gray-300"
                value={entry.itemId}
                onChange={(e) => {
                  if (e.target.value !== entry.itemId) {
                    onMoveHistoryItem(entry.itemId, entry.historyIndex, e.target.value);
                  }
                }}
              >
                {contexts.map(context => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyber-red/10 rounded-full">
          <AlertTriangle className="text-cyber-red" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Review Center</h2>
          <p className="text-xs text-gray-500 font-mono">Unknowns, low-confidence matches, and edge cases.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-cyber-dark border border-cyber-gray rounded-2xl p-8 text-center text-gray-500">
          <p>No review items yet. Keep tracking and check back later.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-mono text-sm">Unknown Items</h3>
              <span className="text-[10px] text-gray-500 font-mono uppercase">{unknownEntries.length}</span>
            </div>
            {unknownEntries.length === 0 ? (
              <div className="text-xs text-gray-500">No unknowns to review.</div>
            ) : (
              <div className="space-y-3">{unknownEntries.map(renderEntry)}</div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-mono text-sm">Low Confidence Matches</h3>
              <span className="text-[10px] text-gray-500 font-mono uppercase">{lowConfidenceEntries.length}</span>
            </div>
            {lowConfidenceEntries.length === 0 ? (
              <div className="text-xs text-gray-500">No low-confidence matches.</div>
            ) : (
              <div className="space-y-3">{lowConfidenceEntries.map(renderEntry)}</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
