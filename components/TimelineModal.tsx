import React, { useState, useMemo } from 'react';
import { X, Copy, Check, FileText, Clock } from 'lucide-react';
import { TrackItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: TrackItem[];
}

export const TimelineModal: React.FC<Props> = ({ isOpen, onClose, items }) => {
  const [copied, setCopied] = useState(false);

  const timelineData = useMemo(() => {
    const allEvents = items.flatMap(item => 
      item.history.map(h => ({
        timestamp: h.timestamp,
        duration: h.duration,
        projectName: item.name,
        reason: h.reason,
        isUnknown: item.isUnknown
      }))
    );
    // Sort by timestamp descending (newest first) for view, but maybe ascending for copy? 
    // Usually log is descending in UI, but chronological in text. Let's do descending for UI.
    return allEvents.sort((a, b) => b.timestamp - a.timestamp); 
  }, [items]);

  const generateTextExport = () => {
    // Sort ascending for text export (chronological story)
    const sortedForText = [...timelineData].sort((a, b) => a.timestamp - b.timestamp);
    return sortedForText.map(e => {
        const date = new Date(e.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = date.toLocaleDateString();
        return `[${dateStr} ${timeStr}] [${e.projectName}] ${e.reason} (${e.duration}s)`;
    }).join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextExport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-cyber-dark border border-cyber-gray w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-cyber-gray">
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Clock className="text-cyber-accent" size={20} />
            Context Timeline
          </h2>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-white/10 border border-cyber-gray rounded text-xs font-mono text-gray-300 transition-colors"
            >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Log'}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-2">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-cyber-gray">
            {timelineData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <FileText size={40} className="mb-2 opacity-20" />
                    <p>No history recorded yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-cyber-gray/50">
                    {timelineData.map((event, idx) => (
                        <div key={idx} className="p-4 hover:bg-white/5 transition-colors flex gap-4 items-start">
                            <div className="w-20 text-xs font-mono text-gray-500 shrink-0 pt-1">
                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-bold truncate ${event.isUnknown ? 'text-gray-400' : 'text-cyber-accent'}`}>
                                        {event.projectName}
                                    </span>
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                                        {event.duration}s
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 break-words leading-relaxed">
                                    {event.reason}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-gray bg-black/20 text-center">
            <p className="text-[10px] text-gray-500 font-mono">
                Showing {timelineData.length} events
            </p>
        </div>

      </div>
    </div>
  );
};
