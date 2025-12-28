import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrackItem, TodoItem } from './types';
import { loadItems, saveItems, clearLocalStorage } from './services/storageService';
import { analyzeScreenshotContext, type AiProvider } from './services/geminiService';
import { TrackItemCard } from './components/TrackItemCard';
import { AddTrackModal } from './components/AddTrackModal';
import { TimelineModal } from './components/TimelineModal';
import { ProjectDetailsModal } from './components/ProjectDetailsModal';
import { DocsPage } from './components/DocsPage';
import { ReviewCenter } from './components/ReviewCenter';
import { Play, Pause, Plus, Monitor, Mic, PictureInPicture, Download, ScanEye, Timer, List, Hourglass, HelpCircle, Heart, LayoutDashboard, AlertCircle, ArrowRight, Video, Trash2, RefreshCw } from 'lucide-center';
import * as LucideIcons from 'lucide-react';

const { Play: PlayI, Pause: PauseI, Plus: PlusI, Monitor: MonitorI, Mic: MicI, PictureInPicture: PictureInPictureI, Download: DownloadI, ScanEye: ScanEyeI, Timer: TimerI, List: ListI, Hourglass: HourglassI, HelpCircle: HelpCircleI, Heart: HeartI, LayoutDashboard: LayoutDashboardI, AlertCircle: AlertCircleI, ArrowRight: ArrowRightI, Video: VideoI, Trash2: Trash2I, RefreshCw: RefreshCwI, ListChecks: ListChecksI, FolderOpen: FolderOpenI } = LucideIcons;

const RATE_LIMITS = { perMinute: 6, perHour: 120 };

const App: React.FC = () => {
  const [items, setItems] = useState<TrackItem[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [intervalTime, setIntervalTime] = useState(30); 
  const [effectiveInterval, setEffectiveInterval] = useState(30);
  const [autoStopMinutes, setAutoStopMinutes] = useState<string>(''); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null); 
  const [cooldownLeft, setCooldownLeft] = useState(0);
  
  // Navigation & View
  const [currentView, setCurrentView] = useState<'dashboard' | 'docs' | 'review'>('dashboard');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDocItem, setSelectedDocItem] = useState<TrackItem | null>(null);

  // Locking (Solo Mode)
  const [lockedProjectId, setLockedProjectId] = useState<string | null>(null);
  
  // Modal Pre-fill state
  const [modalInitialName, setModalInitialName] = useState('');
  const [modalInitialDesc, setModalInitialDesc] = useState('');
  const [linkedFolder, setLinkedFolder] = useState<{ name: string; handle: FileSystemDirectoryHandle } | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProvider>(() => {
    const stored = localStorage.getItem('trackwhat_ai_provider');
    if (stored === 'openai' || stored === 'gemini') return stored;
    const envProvider =
      (import.meta as any)?.env?.VITE_AI_PROVIDER ??
      (import.meta as any)?.env?.AI_PROVIDER;
    return typeof envProvider === 'string' && envProvider.toLowerCase() === 'openai'
      ? 'openai'
      : 'gemini';
  });

  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  
  const itemsRef = useRef(items);
  const isScanningRef = useRef(false);
  const effectiveIntervalRef = useRef(intervalTime);
  const stableMatchIdRef = useRef<string | null>(null);
  const stableMatchCountRef = useRef(0);
  const errorBackoffRef = useRef(0);
  const scanTimestampsRef = useRef<number[]>([]);
  const cooldownLeftRef = useRef(0);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  useEffect(() => {
    itemsRef.current = items;
    if (items.length > 0) saveItems(items);
  }, [items]);

  useEffect(() => {
    effectiveIntervalRef.current = effectiveInterval;
  }, [effectiveInterval]);

  useEffect(() => {
    cooldownLeftRef.current = cooldownLeft;
  }, [cooldownLeft]);

  useEffect(() => {
    setEffectiveInterval(intervalTime);
    stableMatchIdRef.current = null;
    stableMatchCountRef.current = 0;
  }, [intervalTime]);

  useEffect(() => {
    localStorage.setItem('trackwhat_ai_provider', aiProvider);
  }, [aiProvider]);

  const startCapture = async () => {
    setIsInitializing(true);
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      setStream(mediaStream);
      setScanCount(0);
      setTimeLeft(1);
      setEffectiveInterval(intervalTime);
      setCooldownLeft(0);
      stableMatchIdRef.current = null;
      stableMatchCountRef.current = 0;
      errorBackoffRef.current = 0;
      
      if (autoStopMinutes && !isNaN(Number(autoStopMinutes)) && Number(autoStopMinutes) > 0) {
        setAutoStopCountdown(Number(autoStopMinutes) * 60);
      } else {
        setAutoStopCountdown(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsTracking(true);
    } catch (err: any) {
      console.error("Capture Error:", err);
      alert("Capture error. Check permissions.");
      setIsTracking(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsTracking(false);
    setLastAnalysis(null);
    setAutoStopCountdown(null);
    setCooldownLeft(0);
    setTimeLeft(0);
  }, [stream]);

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    const recent = scanTimestampsRef.current.filter(ts => ts > hourAgo);
    scanTimestampsRef.current = recent;
    let perMinuteCount = 0;
    for (const ts of recent) {
      if (ts > minuteAgo) perMinuteCount += 1;
    }

    if (perMinuteCount >= RATE_LIMITS.perMinute || recent.length >= RATE_LIMITS.perHour) {
      return true;
    }

    scanTimestampsRef.current.push(now);
    return false;
  }, []);

  const updateAdaptiveInterval = useCallback((matchId: string | null) => {
    const base = intervalTime;
    if (!matchId) {
      stableMatchIdRef.current = null;
      stableMatchCountRef.current = 0;
      setEffectiveInterval(base);
      return base;
    }

    if (matchId === stableMatchIdRef.current) {
      stableMatchCountRef.current += 1;
    } else {
      stableMatchIdRef.current = matchId;
      stableMatchCountRef.current = 1;
    }

    const stableCount = stableMatchCountRef.current;
    const multiplier = stableCount >= 6 ? 4 : stableCount >= 4 ? 3 : stableCount >= 2 ? 2 : 1;
    const nextInterval = Math.max(base, Math.min(base * 4, base * multiplier));
    setEffectiveInterval(nextInterval);
    return nextInterval;
  }, [intervalTime]);

  const applyErrorBackoff = useCallback(() => {
    errorBackoffRef.current = Math.min(errorBackoffRef.current + 1, 3);
    const cooldownSeconds = Math.min(
      180,
      intervalTime * Math.pow(2, errorBackoffRef.current)
    );
    setCooldownLeft(cooldownSeconds);
    setTimeLeft(cooldownSeconds);
  }, [intervalTime]);

  const performScan = useCallback(async () => {
      if (!isTracking) return;
      if (cooldownLeftRef.current > 0) return;

      if (lockedProjectId) {
         setLastAnalysis(`LOCKED: ${itemsRef.current.find(i => i.id === lockedProjectId)?.name || 'Project'}`);
         setScanCount(c => c + 1);
         setItems(prevItems => {
             const now = Date.now();
             const duration = effectiveIntervalRef.current;
             return prevItems.map(item => {
                if (item.id === lockedProjectId) {
                    return {
                        ...item,
                        detectCount: item.detectCount + 1,
                        totalTime: item.totalTime + duration,
                        lastActive: now,
                        history: [...item.history, { timestamp: now, reason: "Solo Mode (Locked)", duration, matchId: lockedProjectId, confidenceHint: "locked" }]
                    };
                }
                return item;
             });
         });
         setEffectiveInterval(intervalTime);
         setTimeLeft(intervalTime);
         return; 
      }

      if (!stream || !videoRef.current || !canvasRef.current || isScanningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      isScanningRef.current = true;

      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        const duration = effectiveIntervalRef.current;
        const rateLimited = isRateLimited();
        const result = rateLimited
          ? { matchId: null, reason: "Rate limit reached", confidenceHint: "weak", action: null }
          : await (async () => {
              setLastAnalysis("Analyzing...");
              return analyzeScreenshotContext(base64Image, itemsRef.current, aiProvider);
            })();

        if (rateLimited) {
          setLastAnalysis("Rate limited");
        } else if (result.reason === "Analysis failed") {
          setLastAnalysis("Analysis failed (backoff)");
        } else {
          const matchedName = itemsRef.current.find(i => i.id === result.matchId)?.name;
          setLastAnalysis(result.matchId ? `Match: ${matchedName ?? 'Tracked'}` : "No match");
        }

        const normalizedConfidence =
          result.confidenceHint ?? (result.matchId ? "medium" : "weak");

        setScanCount(c => c + 1);

        setItems(prevItems => {
            const now = Date.now();
            const targetId = result.matchId || 'unknown';
            return prevItems.map(item => {
              if (item.id === targetId) {
                  return {
                  ...item,
                  detectCount: item.detectCount + 1,
                  totalTime: item.totalTime + duration,
                  lastActive: now,
                  history: [...item.history, { timestamp: now, reason: result.reason, duration, matchId: result.matchId, candidates: result.candidates, confidenceHint: normalizedConfidence, whyNotSecond: result.whyNotSecond, action: result.action ?? null }]
                  };
              }
              return item;
            });
        });

        if (result.reason === "Analysis failed") {
          applyErrorBackoff();
        } else {
          errorBackoffRef.current = 0;
          setCooldownLeft(0);
          const nextInterval = updateAdaptiveInterval(result.matchId);
          setTimeLeft(nextInterval);
        }
      }
      
      isScanningRef.current = false;

  }, [isTracking, stream, intervalTime, lockedProjectId, applyErrorBackoff, isRateLimited, updateAdaptiveInterval, aiProvider]);

  useEffect(() => {
    let timer: any;
    if (isTracking) {
      timer = setInterval(() => {
        if (cooldownLeft > 0) {
            setCooldownLeft(prev => (prev <= 1 ? 0 : prev - 1));
            setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
        }
        if (cooldownLeft <= 0 && !isScanningRef.current) {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    performScan();
                    return 1;
                }
                return prev - 1;
            });
        }
        if (autoStopCountdown !== null) {
            setAutoStopCountdown(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    stopCapture(); 
                    alert("Auto-stop reached.");
                    return null;
                }
                return prev - 1;
            });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTracking, autoStopCountdown, stopCapture, performScan, cooldownLeft]); 

  const handleAddItem = (
    name: string,
    description: string,
    options: { keywords: string[]; doList: string[]; dontList: string[] }
  ) => {
    const newItem: TrackItem = {
      id: crypto.randomUUID(),
      name, description,
      keywords: options.keywords ?? [],
      doList: options.doList ?? [],
      dontList: options.dontList ?? [],
      totalTime: 0, detectCount: 0, lastActive: 0, history: [],
      todos: []
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this track?')) {
        setItems(prev => prev.filter(i => i.id !== id));
        if (lockedProjectId === id) setLockedProjectId(null);
    }
  };

  const handleResetData = () => {
    if (confirm("DANGER: This will delete ALL tracked projects, notes, and history. Are you sure?")) {
      clearLocalStorage();
    }
  };

  const handleCreateFromHistory = (reason: string) => {
    setModalInitialName(reason.length > 30 ? reason.substring(0, 30) + '...' : reason);
    setModalInitialDesc(`Context: ${reason}`);
    setIsModalOpen(true);
  };

  const handleMoveHistoryItem = (sourceItemId: string, historyIndex: number, targetItemId: string) => {
    setItems(prevItems => {
        const sourceItem = prevItems.find(i => i.id === sourceItemId);
        if (!sourceItem || !sourceItem.history[historyIndex]) return prevItems;
        const historyItemToMove = sourceItem.history[historyIndex];
        const duration = historyItemToMove.duration || effectiveIntervalRef.current || intervalTime;
        const movedHistoryItem = {
          ...historyItemToMove,
          matchId: targetItemId,
          confidenceHint: "manual",
          candidates: undefined,
          whyNotSecond: undefined,
        };

        return prevItems.map(item => {
            if (item.id === sourceItemId) {
                const newHistory = [...item.history];
                newHistory.splice(historyIndex, 1);
                return { ...item, history: newHistory, detectCount: Math.max(0, item.detectCount - 1), totalTime: Math.max(0, item.totalTime - duration) };
            }
            if (item.id === targetItemId) {
                const newHistory = [...item.history, movedHistoryItem].sort((a, b) => a.timestamp - b.timestamp);
                return { ...item, history: newHistory, detectCount: item.detectCount + 1, totalTime: item.totalTime + duration };
            }
            return item;
        });
    });
  };

  const handleEditHistoryItem = (itemId: string, historyIndex: number, newReason: string) => {
    setItems(prevItems => {
        return prevItems.map(item => {
            if (item.id === itemId) {
                const newHistory = [...item.history];
                if (newHistory[historyIndex]) {
                    newHistory[historyIndex] = { ...newHistory[historyIndex], reason: newReason, confidenceHint: "manual", candidates: undefined, whyNotSecond: undefined };
                }
                return { ...item, history: newHistory };
            }
            return item;
        });
    });
  };

  const handleToggleEdgeCase = (itemId: string, historyIndex: number) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== itemId) return item;
        const newHistory = [...item.history];
        if (newHistory[historyIndex]) {
          newHistory[historyIndex] = {
            ...newHistory[historyIndex],
            isEdgeCase: !newHistory[historyIndex].isEdgeCase,
          };
        }
        return { ...item, history: newHistory };
      })
    );
  };

  const handleLinkProjectFolder = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      alert("File System Access API not supported in this browser.");
      return;
    }
    try {
      const handle = await picker();
      setLinkedFolder({ name: handle.name, handle });
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Directory picker error:", error);
        alert("Could not link project folder.");
      }
    }
  };

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }
    if ('documentPictureInPicture' in window) {
      try {
        // @ts-ignore
        const pip = await window.documentPictureInPicture.requestWindow({ width: 400, height: 600 });
        const hitPanel = document.getElementById('hit-panel-container');
        if (hitPanel) pip.document.body.appendChild(hitPanel);
        setPipWindow(pip);
      } catch (err) { alert("PiP Failed"); }
    } else { alert("PiP API not supported."); }
  };

  const totalFocusTime = items.filter(i => !i.isUnknown).reduce((acc, curr) => acc + curr.totalTime, 0);
  const hasAnyLocalData = items.some(item =>
    item.totalTime > 0 ||
    item.detectCount > 0 ||
    item.history.length > 0 ||
    (item.todos?.length ?? 0) > 0 ||
    !!item.notes?.trim()
  );
  const isReviewableReason = (reason: string) => {
    const ignoreList = new Set([
      'Analysis failed',
      'Analyzing...',
      'Rate limit reached',
    ]);
    return reason ? !ignoreList.has(reason) : false;
  };

  const unknownCount =
    items.find(item => item.isUnknown)?.history.filter(entry => isReviewableReason(entry.reason)).length ?? 0;
  const lowConfidenceCount = items.reduce((count, item) => {
    if (item.isUnknown) return count;
    const additional = item.history.filter(entry => {
      if (!isReviewableReason(entry.reason)) return false;
      const confidence = (entry.confidenceHint ?? '').toLowerCase();
      if (confidence === 'legacy' || confidence === 'manual' || confidence === 'locked') return false;
      if (!entry.matchId) return true;
      if (!confidence) return false;
      return confidence !== 'strong';
    }).length;
    return count + additional;
  }, 0);
  const reviewCount = unknownCount + lowConfidenceCount;

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const formatAutoStop = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickMic = () => {
     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
     if (!SpeechRecognition) {
         alert("Speech recognition not supported.");
         return;
     }
     const recognition = new SpeechRecognition();
     recognition.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        console.log("Quick Status Voice:", text);
        alert(`Recorded quick note: "${text}" (Stored in logs)`);
     };
     recognition.start();
  };

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 p-6 font-sans selection:bg-cyber-accent selection:text-black pb-48">
      
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-2">
              Hello: <span className="text-cyber-accent font-mono">Track What?</span>
            </h1>
            <p className="text-gray-500 text-sm font-mono max-w-lg">
               Context-aware tracking powered by Gemini & EntityDB logic.
               &copy; 2025 Dominik Eggermann
            </p>
          </div>
          <button 
            onClick={handleResetData}
            className="p-2 text-gray-700 hover:text-red-500 transition-colors"
            title="Wipe Local Database"
          >
            <Trash2I size={18} />
          </button>
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 items-center">
                
                <div className="group relative flex items-center bg-cyber-dark border border-cyber-gray rounded-lg px-3 py-2 cursor-help">
                    <span className="text-[10px] text-gray-500 mr-2 uppercase font-mono font-bold leading-none">Session Limit</span>
                    {isTracking && autoStopCountdown !== null ? (
                        <span className="text-cyber-red font-mono font-bold w-12 text-right">{formatAutoStop(autoStopCountdown)}</span>
                    ) : (
                        <div className="flex items-center gap-1">
                          <input 
                              type="number" 
                              min="1" 
                              placeholder="∞"
                              disabled={isTracking}
                              value={autoStopMinutes}
                              onChange={(e) => setAutoStopMinutes(e.target.value)}
                              className="w-10 bg-transparent text-white font-mono outline-none text-right placeholder:text-gray-600"
                          />
                          <span className="text-[10px] text-gray-600 font-bold uppercase select-none">min</span>
                        </div>
                    )}
                    <HourglassI size={14} className={`ml-2 ${isTracking && autoStopCountdown !== null ? 'text-cyber-red animate-pulse' : 'text-gray-600'}`} />
                </div>

                <div className="flex items-center bg-cyber-dark border border-cyber-gray rounded-lg px-3 py-2">
                    <span className="text-[10px] text-gray-500 mr-2 uppercase font-mono font-bold leading-none">Interval</span>
                    <div className="flex items-center gap-1">
                      <input 
                          type="number" min="5" disabled={isTracking}
                          value={intervalTime}
                          onChange={(e) => setIntervalTime(Number(e.target.value))}
                          className="w-10 bg-transparent text-white font-mono outline-none text-right"
                      />
                      <span className="text-[10px] text-gray-600 font-bold uppercase select-none">sec</span>
                    </div>
                </div>

                <div className="flex items-center bg-cyber-dark border border-cyber-gray rounded-lg px-2 py-1">
                    <span className="text-[10px] text-gray-500 mr-2 uppercase font-mono font-bold leading-none">LLM</span>
                    <div className="flex bg-black/40 border border-cyber-gray rounded-md p-0.5 gap-0.5">
                      <button
                        onClick={() => setAiProvider('gemini')}
                        className={`px-2 py-1 text-[10px] font-mono rounded ${aiProvider === 'gemini' ? 'bg-cyber-accent text-black' : 'text-gray-400 hover:text-white'}`}
                        title="Use Gemini"
                      >
                        Gemini
                      </button>
                      <button
                        onClick={() => setAiProvider('openai')}
                        className={`px-2 py-1 text-[10px] font-mono rounded ${aiProvider === 'openai' ? 'bg-cyber-accent text-black' : 'text-gray-400 hover:text-white'}`}
                        title="Use OpenAI"
                      >
                        OpenAI
                      </button>
                    </div>
                </div>
                
                <div className="flex bg-cyber-dark border border-cyber-gray rounded-lg p-1 gap-1">
                   <button 
                      onClick={() => setCurrentView('dashboard')}
                      className={`p-2 rounded transition-colors ${currentView === 'dashboard' ? 'bg-cyber-accent text-black' : 'text-gray-400 hover:text-white'}`}
                      title="Dashboard"
                   >
                      <LayoutDashboardI size={18} />
                   </button>
                   <button 
                      onClick={() => setCurrentView('docs')}
                      className={`p-2 rounded transition-colors ${currentView === 'docs' ? 'bg-cyber-accent text-black' : 'text-gray-400 hover:text-white'}`}
                      title="Documentation & Examples"
                   >
                      <HelpCircleI size={18} />
                   </button>
                   <button 
                      onClick={() => setCurrentView('review')}
                      className={`relative p-2 rounded transition-colors ${currentView === 'review' ? 'bg-cyber-accent text-black' : 'text-gray-400 hover:text-white'}`}
                      title="Review Center"
                   >
                      <ListChecksI size={18} />
                      {reviewCount > 0 && (
                        <span className="absolute -top-1 -right-1 text-[10px] leading-none bg-cyber-red text-white rounded-full px-1.5 py-0.5 font-mono">
                          {reviewCount}
                        </span>
                      )}
                   </button>
                </div>

                <button onClick={handleQuickMic} className="p-3 rounded-lg bg-cyber-dark border border-cyber-gray hover:text-white hover:border-cyber-accent transition-colors" title="Quick Voice Status">
                    <MicI size={18} />
                </button>

                <button
                    onClick={handleLinkProjectFolder}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyber-dark border border-cyber-gray hover:text-white hover:border-cyber-accent transition-colors text-xs font-mono"
                    title={linkedFolder ? `Linked: ${linkedFolder.name}` : "Link Project Folder"}
                >
                    <FolderOpenI size={16} />
                    {linkedFolder ? linkedFolder.name : "Link Folder"}
                </button>

                <button onClick={togglePiP} className="p-3 rounded-lg bg-cyber-dark border border-cyber-gray hover:text-white transition-colors" title="Picture in Picture">
                    <PictureInPictureI size={18} />
                </button>

                <button
                    onClick={isTracking ? stopCapture : startCapture}
                    disabled={isInitializing}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg active:scale-95 ${isTracking ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-cyber-accent text-black border border-cyber-accent hover:bg-cyan-300'}`}
                >
                    {isInitializing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Wait...
                      </div>
                    ) : isTracking ? <><PauseI size={18} /> Stop Session</> : <><PlayI size={18} /> Start Tracking</>}
                </button>
            </div>
        </div>
      </header>

      {/* Main Content Switcher */}
      <main className="relative min-h-[50vh]">
          {currentView === 'docs' ? (
              <DocsPage onBack={() => setCurrentView('dashboard')} />
          ) : currentView === 'review' ? (
              <ReviewCenter
                items={items}
                onMoveHistoryItem={handleMoveHistoryItem}
                onCreateFromHistory={handleCreateFromHistory}
                onToggleEdgeCase={handleToggleEdgeCase}
              />
          ) : (
            <div id="hit-panel-container">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl text-white font-mono flex items-center gap-2">
                      <ScanEyeI size={20} className="text-cyber-red" />
                      Hit Panel
                  </h2>
                  <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 px-3 py-1 rounded transition-colors"
                  >
                      <PlusI size={14} /> Add Vector
                  </button>
              </div>

              {/* Empty State / Getting Started */}
              {items.length === 1 && !isTracking && !hasAnyLocalData && (
                <div className="bg-cyber-dark border border-cyber-gray p-10 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-700">
                  <div className="bg-cyber-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyber-accent/20">
                    <AlertCircleI className="text-cyber-accent" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Let's track something.</h3>
                  <p className="text-gray-500">
                    No active projects found. You can define a specific "Vector" or just start recording into the "Unknown" bucket to categorize later.
                  </p>
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 bg-cyber-accent text-black font-bold px-8 py-3 rounded-full hover:scale-105 transition-transform w-full sm:w-auto justify-center"
                    >
                      <PlusI size={18} /> Create Vector
                    </button>
                    <button 
                      onClick={startCapture}
                      className="flex items-center gap-2 bg-white/5 text-white border border-white/20 font-bold px-8 py-3 rounded-full hover:bg-white/10 hover:scale-105 transition-all w-full sm:w-auto justify-center"
                    >
                      <VideoI size={18} /> Start Recording
                    </button>
                  </div>
                </div>
              )}

              <div className="masonry-grid relative">
                  {lockedProjectId && <div className="absolute inset-0 z-0 bg-cyber-black/50 pointer-events-none backdrop-grayscale transition-all" />}
                  
                  {items.map(item => (
                        <TrackItemCard 
                          key={item.id} item={item} allContexts={items.map(i => ({ id: i.id, name: i.name }))}
                          isActive={Date.now() - item.lastActive < (intervalTime * 1000) + 2000 && item.detectCount > 0}
                          isLocked={lockedProjectId === item.id}
                          isDimmed={!!lockedProjectId && lockedProjectId !== item.id}
                          onToggleLock={(id) => setLockedProjectId(prev => prev === id ? null : id)}
                          onOpenDetails={(i) => setSelectedDocItem(i)}
                          onDelete={item.isUnknown ? undefined : handleDeleteItem}
                          onMoveHistoryItem={handleMoveHistoryItem}
                          onEditHistoryItem={handleEditHistoryItem}
                          onCreateFromHistory={handleCreateFromHistory}
                          onCopyLog={(id) => {}}
                      />
                  ))}
              </div>
            </div>
          )}
      </main>

      {/* Floating Status Bar */}
      {isTracking && currentView === 'dashboard' && (
        <button onClick={performScan} disabled={isScanningRef.current} className="fixed bottom-32 right-6 z-40 flex items-center gap-4 border border-cyber-gray px-4 py-3 rounded-full shadow-2xl bg-cyber-dark/95 backdrop-blur hover:border-cyber-accent transition-all active:scale-95">
            <div className="flex items-center gap-3">
                 <div className="relative">
                    {(timeLeft <= 2 || isScanningRef.current) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-20"></span>}
                    <MonitorI className={(timeLeft <= 2 || isScanningRef.current) ? "text-green-400" : "text-gray-500"} size={18} />
                 </div>
                 <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isScanningRef.current ? "Analyzing..." : "Auto-Scanning"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/80 font-mono truncate max-w-[150px]">
                        {lastAnalysis ?? "Waiting..."}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
                        {isScanningRef.current ? "scan…" : `next ${timeLeft}s`}
                      </span>
                    </div>
                 </div>
            </div>
            <div className="h-6 w-px bg-cyber-gray mx-1"></div>
            <div className="text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hits</div>
                <div className="text-xs font-mono text-white">{scanCount}</div>
            </div>
        </button>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-cyber-black/95 backdrop-blur border-t-2 border-green-500/50 p-4 px-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-green-500/10 rounded-full"><TimerI className="text-green-500" size={24} /></div>
            <div className="flex flex-col">
                <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest font-bold">Total Project Time</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">{formatTotalTime(totalFocusTime)}</span>
            </div>
        </div>
        <button onClick={() => setIsTimelineOpen(true)} className="px-5 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg flex items-center gap-2 transition-all font-mono text-sm hover:bg-green-500/20">
            <ListI size={16} /> View Timeline
        </button>
      </div>

      <AddTrackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddItem} initialName={modalInitialName} initialDescription={modalInitialDesc} />
      <TimelineModal isOpen={isTimelineOpen} onClose={() => setIsTimelineOpen(false)} items={items} />
      <ProjectDetailsModal 
        isOpen={!!selectedDocItem} 
        onClose={() => setSelectedDocItem(null)} 
        item={selectedDocItem} 
        onSaveNotes={(id, n) => setItems(prev => prev.map(i => i.id === id ? {...i, notes: n} : i))}
        onSaveTodos={(id, t) => setItems(prev => prev.map(i => i.id === id ? {...i, todos: t} : i))}
      />
    </div>
  );
};

export default App;
