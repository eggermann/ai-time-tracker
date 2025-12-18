import React from 'react';
import { ScanEye, Lock, Database, FileText, Heart, ExternalLink, BrainCircuit, Lightbulb, ChevronRight } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const DocsPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Intro Section */}
      <section className="text-center space-y-4 pt-4">
        <h2 className="text-4xl font-bold text-white font-mono">
          Project <span className="text-cyber-accent">Documentation</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          TrackWhat is a next-generation semantic activity logger. Unlike traditional trackers that look at "Window Titles", we analyze the <strong>actual content</strong> of your work.
        </p>
      </section>

      {/* How it Functions */}
      <section className="bg-cyber-dark border border-cyber-gray rounded-2xl p-8 space-y-6 shadow-xl">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <BrainCircuit className="text-cyber-accent" />
          How it Functions
        </h3>
        <div className="grid md:grid-cols-3 gap-8 text-sm leading-relaxed">
          <div className="space-y-2">
            <div className="text-cyber-accent font-bold font-mono">01. CAPTURE</div>
            <p className="text-gray-400">The app captures a low-resolution screenshot of your workspace at a set interval (default 30s).</p>
          </div>
          <div className="space-y-2">
            <div className="text-cyber-accent font-bold font-mono">02. ANALYZE</div>
            <p className="text-gray-400">Gemini 3 Flash analyzes the image and generates a semantic description of your activity.</p>
          </div>
          <div className="space-y-2">
            <div className="text-cyber-accent font-bold font-mono">03. VECTOR MATCH</div>
            <p className="text-gray-400">The AI compares this description against your defined "Vectors" (Projects) and assigns time automatically.</p>
          </div>
        </div>
      </section>

      {/* Step-by-Step Guide */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <Lightbulb className="text-yellow-400" />
          What to do: Step-by-Step
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-start bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="bg-cyber-accent text-black font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-1">1</div>
            <div>
              <h4 className="font-bold text-white mb-1">Define your Vectors</h4>
              <p className="text-sm text-gray-400">Create a new Project. In the description, be specific: <i>"Working on Java code in IntelliJ, dark theme, using terminal frequently."</i></p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="bg-cyber-accent text-black font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-1">2</div>
            <div>
              <h4 className="font-bold text-white mb-1">Start Tracking</h4>
              <p className="text-sm text-gray-400">Grant screen permissions and let the app run. It will categorize your time between your Projects and the "Unknown" bucket.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="bg-cyber-accent text-black font-bold h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-1">3</div>
            <div>
              <h4 className="font-bold text-white mb-1">Refine from Unknown</h4>
              <p className="text-sm text-gray-400">Check the "Unknown" card. If a task repeats, click the (+) icon to instantly create a new Vector from that AI detection.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="border border-cyber-gray p-6 rounded-2xl space-y-4 bg-black/40">
          <h4 className="font-bold text-cyber-accent flex items-center gap-2">
            <ChevronRight size={18} />
            Example: Developer Workflow
          </h4>
          <p className="text-xs text-gray-500 italic font-mono">"Developing Frontend in VS Code, React components visible, browsing tailwind documentation."</p>
          <p className="text-sm text-gray-400">This allows the AI to distinguish between "Coding" and "Communication" even if both happen in a browser.</p>
        </div>
        <div className="border border-cyber-gray p-6 rounded-2xl space-y-4 bg-black/40">
          <h4 className="font-bold text-cyber-red flex items-center gap-2">
            <ChevronRight size={18} />
            Example: Deep Focus (Solo)
          </h4>
          <p className="text-sm text-gray-400">When you are doing one task for hours, use the <strong>Lock (Solo Mode)</strong>. It saves API costs and browser resources by pausing all analysis and giving 100% of the time to that project.</p>
        </div>
      </section>

      {/* Technical Credits & Support */}
      <section className="pt-12 border-t border-cyber-gray text-center space-y-8">
        <div className="space-y-2">
          <p className="text-white font-mono font-bold">Powered by Gemini & EntityDB logic.</p>
          <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">
            &copy; 2025 Dominik Eggermann
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyber-accent/10 to-transparent p-10 rounded-3xl border border-cyber-accent/20 flex flex-col items-center gap-6">
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Heart className="text-cyber-red fill-cyber-red" />
              Support the Development
            </h3>
            <p className="text-gray-400 max-w-lg">
              If TrackWhat helps you understand your productivity, consider supporting the next phase of the <strong>EntityDB</strong> logic development.
            </p>
          </div>
          
          <a 
            href="https://www.paypal.com/donate/?hosted_button_id=ZQNUKXHAW588L"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-cyber-accent text-black font-bold px-10 py-4 rounded-full hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:scale-105 active:scale-95 text-lg"
          >
            Donate via PayPal <ExternalLink size={20} />
          </a>
        </div>
        
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-white transition-colors underline decoration-dotted font-mono text-sm"
        >
          Return to Dashboard
        </button>
      </section>
    </div>
  );
};
