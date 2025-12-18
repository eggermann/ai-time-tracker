import React from 'react';
import { X, HelpCircle, ScanEye, Lock, Database, FileText, Heart, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-cyber-dark border border-cyber-gray w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-cyber-gray bg-black/20">
          <h2 className="text-2xl font-mono font-bold text-cyber-accent flex items-center gap-3">
            <HelpCircle size={28} />
            TrackWhat: Documentation
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 font-sans leading-relaxed space-y-8">
          
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ScanEye size={20} className="text-cyber-red" />
              The Core Concept
            </h3>
            <p className="text-gray-400">
              TrackWhat uses the <strong>Gemini 3 Flash</strong> model to "watch" your screen at regular intervals. 
              Instead of tracking specific applications (which can be misleading), it analyzes the <strong>semantic context</strong> of what you are actually doing.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Database size={16} className="text-cyber-accent" />
                Vectors (Projects)
              </h4>
              <p className="text-sm text-gray-400">
                Create "Vectors" by describing your project context. For example: <i>"Coding in VS Code, dark theme, React documentation in Chrome."</i> Gemini uses this description to match your current screen state.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Lock size={16} className="text-yellow-400" />
                Solo Mode (Locking)
              </h4>
              <p className="text-sm text-gray-400">
                Click the <strong>Lock</strong> icon on a project to enter Solo Mode. This stops all AI analysis and screenshots, automatically assigning all time to that project. Best for deep-focus work.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FileText size={20} className="text-cyber-accent" />
              How to use effectively
            </h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm">
              <li><strong>Unknown Track:</strong> Check here regularly. If you see a recurring activity, click the <PlusCircle size={14} className="inline mx-1 text-cyber-accent" /> icon to create a new Project from that detection.</li>
              <li><strong>Refining:</strong> Use the <strong>Move</strong> <ArrowRight size={14} className="inline mx-1" /> icon in history to move incorrect detections. This helps keep your timeline clean.</li>
              <li><strong>Documentation:</strong> Click the title of any project to open the <strong>Dok Page</strong>—a workspace for notes, todos, and detailed project stats.</li>
              <li><strong>PiP Mode:</strong> Use the Picture-in-Picture button to keep a floating "Hit Panel" visible while you work.</li>
            </ul>
          </section>

          <div className="bg-cyber-accent/5 border border-cyber-accent/20 p-6 rounded-2xl text-center space-y-4">
            <p className="text-white font-mono text-sm">
              Powered by <strong>Gemini & EntityDB</strong> logic.
            </p>
            <div className="flex flex-col items-center gap-3">
              <h4 className="text-white font-bold flex items-center gap-2">
                <Heart size={18} className="text-cyber-red fill-cyber-red" />
                Support the Developer
              </h4>
              <p className="text-sm text-gray-400 max-w-md">
                If TrackWhat helps your productivity, consider supporting my work on the next version of the EntityDB logic.
              </p>
              <a 
                href="https://www.paypal.com/donate/?hosted_button_id=ZQNUKXHAW588L"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-cyber-accent text-black font-bold px-6 py-3 rounded-full hover:bg-cyan-300 transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                Donate via PayPal <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-gray bg-black/40 text-center">
            <p className="text-xs text-gray-500 font-mono">
              &copy; {new Date().getFullYear()} dominik eggermann
            </p>
        </div>
      </div>
    </div>
  );
};

const PlusCircle = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);
const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
