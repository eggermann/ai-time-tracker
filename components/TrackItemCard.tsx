import React, { useState } from 'react';
import { TrackItem } from '../types';
import { Clock, Activity, History, BrainCircuit, ChevronDown, ChevronUp, PlusCircle, ArrowRight, Copy, Check } from 'lucide-react';

interface Props {
  item: TrackItem;
  allContexts: { id: string; name: string }[];
  isActive: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoveHistoryItem: (itemId: string, historyIndex: number, targetItemId: string) => void;
  onCreateFromHistory: (reason: string) => void;
  onCopyLog: (itemId: string) => void;
}

export const TrackItemCard: React.FC<Props> = ({ 
  item, 
  allContexts, 
  isActive, 
  onDelete, 
  onMoveHistoryItem,
  onCreateFromHistory,
  onCopyLog
}) => {
  const [isTrainMode, setIsTrainMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyClick = () => {
    onCopyLog(item.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Group recurring reasons for suggestions (simple heuristic)
  const isRecurring = (reason: string) => {
    return item.history.filter(h => h.reason === reason).length > 2;
  };

  const latestHistoryItem = item.history.length > 0 ? item.history[item.history.length - 1] : null;

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl bg-cyber-dark border transition-all duration-300 flex flex-col
        ${isActive ? 'active-pulse border-cyber-red' : 'border-cyber-gray hover:border-cyber-accent'}
      `}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-cyber-red shadow-[0_0_10px_#ff2a6d]" />
      )}

      <div className="p-4 space-y-3 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-mono font-bold text-lg text-white truncate pr-2 flex-1">
            {item.name}
          </h3>
          <div className="flex items-center gap-1">
            {isActive && (
                <span className="flex h-3 w-3 relative mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-red"></span>
                </span>
            )}
            
            <button 
                onClick={handleCopyClick}
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Copy Project Timeline"
            >
                {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>

            <button 
                onClick={() => setIsTrainMode(!isTrainMode)}
                className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isTrainMode ? 'text-cyber-accent' : 'text-gray-500'}`}
                title="Train / View Data"
            >
                <BrainCircuit size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 line-clamp-2 h-8">
          {item.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-cyber-gray">
            {/* Green Total Time for this Project */}
            <div className="flex items-center text-green-400 bg-green-900/10 px-2 py-1 rounded border border-green-900/20">
                <Clock size={14} className="mr-1.5" />
                <span className="font-mono text-sm font-bold tracking-tight">{formatTime(item.totalTime)}</span>
            </div>
            
            <div className="flex items-center text-gray-500">
                <Activity size={14} className="mr-1" />
                <span className="font-mono text-xs">{item.detectCount} hits</span>
            </div>
        </div>

        {/* Latest History / Training Mode */}
        <div className={`mt-2 transition-all duration-300 ${isTrainMode ? 'bg-black/40 rounded p-2' : 'bg-black/30 rounded p-2'}`}>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1 cursor-pointer" onClick={() => setIsTrainMode(!isTrainMode)}>
                <div className="flex items-center">
                    <History size={10} className="mr-1" />
                    {isTrainMode ? 'Recent Detections (Train)' : 'Latest Detection'}
                </div>
                {isTrainMode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            
            {!isTrainMode ? (
               <div className="flex justify-between items-start gap-2">
                  <p className="text-xs text-white/80 italic line-clamp-2 flex-1">
                      {latestHistoryItem ? latestHistoryItem.reason : "No data yet..."}
                  </p>
                  
                  {/* Action Buttons specifically for the LATEST item, shown outside collapsible when closed */}
                  {item.isUnknown && latestHistoryItem && (
                     <div className="flex items-center gap-1 shrink-0 bg-cyber-black/50 rounded p-1">
                          <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateFromHistory(latestHistoryItem.reason);
                                }}
                                className="text-cyber-accent hover:text-white p-1"
                                title="Create new track from this"
                            >
                                <PlusCircle size={16} />
                            </button>
                            
                            <div className="relative group/select">
                                <select 
                                    className="w-5 h-5 opacity-0 absolute inset-0 cursor-pointer"
                                    value={item.id}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        if(e.target.value !== item.id) {
                                            // Move the last item (index: item.history.length - 1)
                                            onMoveHistoryItem(item.id, item.history.length - 1, e.target.value);
                                        }
                                    }}
                                >
                                    {allContexts.map(ctx => (
                                        <option key={ctx.id} value={ctx.id}>
                                            {ctx.name}
                                        </option>
                                    ))}
                                </select>
                                <ArrowRight size={16} className="text-gray-400 hover:text-cyber-red" />
                            </div>
                     </div>
                  )}
               </div>
            ) : (
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyber-gray">
                    {item.history.length === 0 && <p className="text-xs text-gray-600 italic">No history recorded.</p>}
                    {[...item.history].reverse().slice(0, 20).map((h, idx) => {
                        const originalIndex = item.history.length - 1 - idx;
                        const recurring = isRecurring(h.reason);
                        return (
                            <div key={idx} className="group flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500 font-mono">{formatTimestamp(h.timestamp)}</span>
                                    {recurring && item.isUnknown && (
                                         <span className="text-[8px] px-1 bg-cyber-accent text-black rounded font-bold">SUGGEST</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-white truncate flex-1" title={h.reason}>{h.reason}</span>
                                    
                                    {/* Action Buttons for History List */}
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                                        {/* Create New Track from this */}
                                        {item.isUnknown && (
                                            <button 
                                                onClick={() => onCreateFromHistory(h.reason)}
                                                className="text-cyber-accent hover:text-white p-1"
                                                title="Create new track from this"
                                            >
                                                <PlusCircle size={14} />
                                            </button>
                                        )}
                                        
                                        {/* Reassign / Move */}
                                        <div className="relative group/select">
                                            <select 
                                                className="w-4 h-4 opacity-0 absolute inset-0 cursor-pointer"
                                                value={item.id}
                                                onChange={(e) => {
                                                    if(e.target.value !== item.id) {
                                                        onMoveHistoryItem(item.id, originalIndex, e.target.value);
                                                    }
                                                }}
                                            >
                                                {allContexts.map(ctx => (
                                                    <option key={ctx.id} value={ctx.id}>
                                                        {ctx.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ArrowRight size={14} className="text-gray-400 hover:text-cyber-red" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {!item.isUnknown && onDelete && isTrainMode && (
         <div className="p-4 pt-0">
            <button 
                onClick={() => onDelete(item.id)}
                className="w-full text-xs text-red-900/50 hover:text-red-500 hover:bg-red-950/30 py-2 rounded transition-colors border border-transparent hover:border-red-900/30"
            >
                Delete Track
            </button>
         </div>
      )}
    </div>
  );
};
