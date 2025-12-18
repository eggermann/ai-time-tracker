import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, Clock } from 'lucide-react';
import { TrackItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: TrackItem | null;
  onSaveNotes: (id: string, notes: string) => void;
}

export const ProjectDetailsModal: React.FC<Props> = ({ isOpen, onClose, item, onSaveNotes }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setNotes(item.notes || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-cyber-dark border border-cyber-gray w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start p-8 border-b border-cyber-gray bg-black/20">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <FileText className="text-cyber-accent" size={28} />
                <h2 className="text-3xl font-mono font-bold text-white tracking-tight">
                {item.name}
                </h2>
            </div>
            <p className="text-gray-400 font-mono text-sm max-w-2xl">{item.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors">
            <X size={32} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Main Content - Documentation / Notes */}
            <div className="flex-1 p-8 overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white font-mono">Documentation / Notes</h3>
                    <button 
                        onClick={() => onSaveNotes(item.id, notes)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyber-accent text-black font-bold rounded hover:bg-cyan-300 transition-colors text-sm"
                    >
                        <Save size={16} /> Save Docs
                    </button>
                </div>
                
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write detailed project documentation, todos, or scratchpad notes here..."
                    className="w-full flex-1 bg-black/30 border border-cyber-gray rounded-xl p-6 text-gray-200 font-mono leading-relaxed outline-none focus:border-cyber-accent resize-none shadow-inner"
                />
            </div>

            {/* Sidebar - Stats */}
            <div className="w-80 border-l border-cyber-gray bg-black/10 p-6 overflow-y-auto hidden md:block">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Statistics</h3>
                
                <div className="space-y-6">
                    <div className="bg-cyber-gray/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-cyber-accent mb-2">
                            <Clock size={16} />
                            <span className="text-xs font-bold uppercase">Total Time</span>
                        </div>
                        <div className="text-2xl font-mono text-white">
                            {(item.totalTime / 3600).toFixed(1)}h
                        </div>
                    </div>

                    <div className="bg-cyber-gray/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-cyber-red mb-2">
                            <Calendar size={16} />
                            <span className="text-xs font-bold uppercase">Sessions</span>
                        </div>
                        <div className="text-2xl font-mono text-white">
                            {item.detectCount}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Contexts</h4>
                        <div className="space-y-2">
                            {[...item.history].reverse().slice(0, 8).map((h, i) => (
                                <div key={i} className="text-xs text-gray-400 bg-black/20 p-2 rounded border border-white/5">
                                    {h.reason}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};