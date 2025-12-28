import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, options: { keywords: string[]; doList: string[]; dontList: string[] }) => void;
  initialName?: string;
  initialDescription?: string;
}

export const AddTrackModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialName = '', initialDescription = '' }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [doList, setDoList] = useState('');
  const [dontList, setDontList] = useState('');

  // Update state when initial values change or modal opens
  useEffect(() => {
    if (isOpen) {
        setName(initialName);
        setDescription(initialDescription);
        setKeywords('');
        setDoList('');
        setDontList('');
    }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cyber-dark border border-cyber-gray w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Sparkles className="text-cyber-accent" size={20} />
            {initialName ? 'Train New Vector' : 'New Context'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">TRACK NAME</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Phoenix"
              className="w-full bg-black/50 border border-cyber-gray rounded p-3 text-white focus:border-cyber-accent outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">SEMANTIC CONTEXT (Logic)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this looks like. e.g. 'Coding in VS Code with dark theme, React code visible, github pages open.'"
              className="w-full bg-black/50 border border-cyber-gray rounded p-3 text-white focus:border-cyber-accent outline-none font-mono h-32 resize-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">
               This description is vectorized and used to match screenshots. Be specific about visual cues.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">KEYWORDS (comma-separated)</label>
            <input 
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., client name, domain, tool"
              className="w-full bg-black/50 border border-cyber-gray rounded p-3 text-white focus:border-cyber-accent outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">DO (one per line)</label>
            <textarea 
              value={doList}
              onChange={(e) => setDoList(e.target.value)}
              placeholder="What clearly belongs here"
              className="w-full bg-black/50 border border-cyber-gray rounded p-3 text-white focus:border-cyber-accent outline-none font-mono h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">DON'T (one per line)</label>
            <textarea 
              value={dontList}
              onChange={(e) => setDontList(e.target.value)}
              placeholder="What should NOT be matched"
              className="w-full bg-black/50 border border-cyber-gray rounded p-3 text-white focus:border-cyber-accent outline-none font-mono h-20 resize-none"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (name && description) {
                const parseCommaList = (value: string) =>
                  value
                    .split(',')
                    .map(entry => entry.trim())
                    .filter(Boolean);
                const parseLineList = (value: string) =>
                  value
                    .split('\n')
                    .map(entry => entry.trim())
                    .filter(Boolean);
                onSave(name, description, {
                  keywords: parseCommaList(keywords),
                  doList: parseLineList(doList),
                  dontList: parseLineList(dontList),
                });
                setName('');
                setDescription('');
                setKeywords('');
                setDoList('');
                setDontList('');
                onClose();
              }
            }}
            className="px-6 py-2 bg-cyber-accent text-black font-bold rounded hover:bg-cyan-300 transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save Vector
          </button>
        </div>
      </div>
    </div>
  );
};
