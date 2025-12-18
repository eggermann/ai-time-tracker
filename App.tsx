import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrackItem } from './types';
import { loadItems, saveItems } from './services/storageService';
import { analyzeScreenshotContext } from './services/geminiService';
import { TrackItemCard } from './components/TrackItemCard';
import { AddTrackModal } from './components/AddTrackModal';
import { TimelineModal } from './components/TimelineModal';
import { Play, Pause, Plus, Monitor, Mic, PictureInPicture, Download, ScanEye, Timer, List, Hourglass } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<TrackItem[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [intervalTime, setIntervalTime] = useState(30); // Seconds
  const [autoStopMinutes, setAutoStopMinutes] = useState<string>(''); // User input for auto stop
  const [timeLeft, setTimeLeft] = useState(0); // Countdown for scan
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null); // Countdown for stop
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  
  // Modal Pre-fill state for "Suggestions"
  const [modalInitialName, setModalInitialName] = useState('');
  const [modalInitialDesc, setModalInitialDesc] = useState('');

  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  
  // Ref to hold items for access inside useEffect without triggering re-renders
  const itemsRef = useRef(items);

  // Load initial data
  useEffect(() => {
    setItems(loadItems());
  }, []);

  // Update ref and save on change
  useEffect(() => {
    itemsRef.current = items;
    if (items.length > 0) saveItems(items);
  }, [items]);

  // Start Screen Capture
  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 }, // Optimized for analysis speed
        audio: false
      });
      setStream(mediaStream);
      setScanCount(0); // Reset counter
      setTimeLeft(1); // Start almost immediately
      
      // Initialize Auto-Stop if set
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
      console.error("Error accessing display media:", err);
      if (err.name === 'NotAllowedError') {
         alert("Permission to capture screen was denied.");
      } else if (err.message && err.message.includes("permissions policy")) {
         alert("Screen capture is disabled by the browser's permission policy in this environment. Please ensure 'display-capture' is allowed.");
      } else {
         alert(`Failed to start screen capture: ${err.message}`);
      }
      setIsTracking(false);
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
  }, [stream]);

  // Main Tracking Loop with Countdown & Auto-Stop
  useEffect(() => {
    let timer: any;
    let initialCheckFrame: number;

    const performScan = async () => {
      if (!isTracking || !stream || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure video is ready
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/png').split(',')[1];

        setLastAnalysis("Analyzing...");

        // Analyze
        const result = await analyzeScreenshotContext(base64Image, itemsRef.current);
        
        // Update stats
        setLastAnalysis(result.matchId ? `Match: ${result.matchId === 'unknown' ? 'Idle' : 'Tracked'}` : "No match");
        setScanCount(c => c + 1);

        setItems(prevItems => {
            const now = Date.now();
            const targetId = result.matchId || 'unknown'; // Default to unknown if null
            
            return prevItems.map(item => {
            if (item.id === targetId) {
                return {
                ...item,
                detectCount: item.detectCount + 1,
                totalTime: item.totalTime + intervalTime,
                lastActive: now,
                history: [...item.history, { timestamp: now, reason: result.reason, duration: intervalTime }]
                };
            }
            return item;
            });
        });
      }
    };

    if (isTracking) {
      // Countdown Timer Logic
      timer = setInterval(() => {
        // Handle Scan Countdown
        setTimeLeft(prev => {
          if (prev <= 1) {
             performScan();
             return intervalTime; 
          }
          return prev - 1;
        });

        // Handle Auto-Stop Countdown
        if (autoStopCountdown !== null) {
            setAutoStopCountdown(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    stopCapture(); // Stop tracking when time is up
                    alert("Auto-stop timer reached. Tracking stopped.");
                    return null;
                }
                return prev - 1;
            });
        }
      }, 1000);
    }

    return () => {
        clearInterval(timer);
        if (initialCheckFrame) cancelAnimationFrame(initialCheckFrame);
    };
  }, [isTracking, stream, intervalTime, autoStopCountdown, stopCapture]); 

  const handleAddItem = (name: string, description: string) => {
    const newItem: TrackItem = {
      id: crypto.randomUUID(),
      name,
      description,
      totalTime: 0,
      detectCount: 0,
      lastActive: 0,
      history: []
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this track? History will be lost.')) {
        setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleCreateFromHistory = (reason: string) => {
    setModalInitialName(reason.length > 30 ? reason.substring(0, 30) + '...' : reason);
    setModalInitialDesc(`Context where the screen shows: ${reason}`);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setModalInitialName('');
    setModalInitialDesc('');
    setIsModalOpen(true);
  }

  const handleMoveHistoryItem = (sourceItemId: string, historyIndex: number, targetItemId: string) => {
    setItems(prevItems => {
        const sourceItem = prevItems.find(i => i.id === sourceItemId);
        if (!sourceItem || !sourceItem.history[historyIndex]) return prevItems;

        const historyItemToMove = sourceItem.history[historyIndex];
        const duration = historyItemToMove.duration || intervalTime;

        return prevItems.map(item => {
            if (item.id === sourceItemId) {
                const newHistory = [...item.history];
                newHistory.splice(historyIndex, 1);
                return {
                    ...item,
                    history: newHistory,
                    detectCount: Math.max(0, item.detectCount - 1),
                    totalTime: Math.max(0, item.totalTime - duration)
                };
            }
            if (item.id === targetItemId) {
                const newHistory = [...item.history, historyItemToMove].sort((a, b) => a.timestamp - b.timestamp);
                
                let newDescription = item.description;
                if (!newDescription.includes(historyItemToMove.reason)) {
                    newDescription = `${newDescription} (Also matches context: "${historyItemToMove.reason}")`;
                }

                return {
                    ...item,
                    description: newDescription,
                    history: newHistory,
                    detectCount: item.detectCount + 1,
                    totalTime: item.totalTime + duration
                };
            }
            return item;
        });
    });
  };

  const handleCopyProjectLog = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Filter events for this item and sort chronologically for text export
    const events = [...item.history].sort((a, b) => a.timestamp - b.timestamp);
    const textLog = events.map(e => {
        const date = new Date(e.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = date.toLocaleDateString();
        // Assuming intervalTime is approx duration if not set
        const duration = e.duration || intervalTime; 
        return `[${dateStr} ${timeStr}] ${e.reason} (${duration}s)`;
    }).join('\n');

    const header = `--- Tracking Log: ${item.name} ---\nTotal Time: ${formatTotalTime(item.totalTime)}\n\n`;
    navigator.clipboard.writeText(header + textLog);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "trackwhat_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pip.document.head.appendChild(style);
          } catch (e) {
             const link = document.createElement('link');
             link.rel = 'stylesheet';
             link.type = 'text/css';
             link.href = styleSheet.href || '';
             pip.document.head.appendChild(link);
          }
        });
        const script = document.createElement('script');
        script.src = "https://cdn.tailwindcss.com";
        pip.document.head.appendChild(script);
        const hitPanel = document.getElementById('hit-panel-container');
        if (hitPanel) pip.document.body.appendChild(hitPanel);
        pip.addEventListener('pagehide', () => {
          const mainRoot = document.getElementById('main-container-slot');
          if (hitPanel && mainRoot) mainRoot.appendChild(hitPanel);
          setPipWindow(null);
        });
        setPipWindow(pip);
      } catch (err: any) {
        console.error("PiP failed", err);
        alert("Picture-in-Picture failed: " + err.message);
      }
    } else {
        alert("Document Picture-in-Picture API not supported in this browser.");
    }
  };

  const allContextList = items.map(i => ({ id: i.id, name: i.name }));

  // Calculate Total Focus Time (excluding unknown)
  const totalFocusTime = items
    .filter(i => !i.isUnknown)
    .reduce((acc, curr) => acc + curr.totalTime, 0);

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

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 p-6 font-sans selection:bg-cyber-accent selection:text-black pb-32">
      
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-2">
            Hello: <span className="text-cyber-accent font-mono">Track What?</span>
          </h1>
          <p className="text-gray-500 text-sm font-mono max-w-lg">
             Context-aware workflow tracking. Powered by Gemini & EntityDB logic.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
            {/* Auto-Stop Input */}
            <div className="flex items-center bg-cyber-dark border border-cyber-gray rounded-lg px-3 py-2" title="Stop tracking automatically after X minutes">
                <span className="text-xs text-gray-400 mr-2 uppercase font-mono">Auto-Stop (m)</span>
                {isTracking && autoStopCountdown !== null ? (
                    <span className="text-cyber-red font-mono font-bold w-12 text-right">{formatAutoStop(autoStopCountdown)}</span>
                ) : (
                    <input 
                        type="number" 
                        min="1" 
                        placeholder="∞"
                        disabled={isTracking}
                        value={autoStopMinutes}
                        onChange={(e) => setAutoStopMinutes(e.target.value)}
                        className="w-12 bg-transparent text-white font-mono outline-none text-right disabled:opacity-50"
                    />
                )}
                <Hourglass size={14} className={`ml-2 ${isTracking && autoStopCountdown !== null ? 'text-cyber-red animate-pulse' : 'text-gray-600'}`} />
            </div>

            <div className="flex items-center bg-cyber-dark border border-cyber-gray rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 mr-2 uppercase font-mono">Interval (s)</span>
                <input 
                    type="number" 
                    min="5" 
                    disabled={isTracking}
                    value={intervalTime}
                    onChange={(e) => setIntervalTime(Number(e.target.value))}
                    className="w-12 bg-transparent text-white font-mono outline-none text-right disabled:opacity-50"
                />
            </div>
            
            <button onClick={handleExport} className="p-3 rounded-lg bg-cyber-dark border border-cyber-gray hover:text-white transition-colors">
                <Download size={18} />
            </button>
             
             <button className="p-3 rounded-lg bg-cyber-dark border border-cyber-gray text-gray-600 cursor-not-allowed relative group">
                <Mic size={18} />
                <span className="absolute -top-1 -right-1 text-[8px] bg-cyber-gray px-1 rounded text-white">TODO</span>
            </button>

            <button onClick={togglePiP} className={`p-3 rounded-lg border transition-colors ${pipWindow ? 'bg-cyber-accent text-black border-cyber-accent' : 'bg-cyber-dark border-cyber-gray hover:text-white'}`}>
                <PictureInPicture size={18} />
            </button>

            <button
                onClick={isTracking ? stopCapture : startCapture}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg ${isTracking ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' : 'bg-cyber-accent text-black border border-cyber-accent hover:bg-cyan-300'}`}
            >
                {isTracking ? <><Pause size={18} /> Stop Tracking</> : <><Play size={18} /> Start Context</>}
            </button>
        </div>
      </header>

      {/* Floating Status Bar - Moved higher to avoid footer overlap */}
      {isTracking && (
        <div className="fixed bottom-28 right-6 z-40 flex items-center gap-4 bg-cyber-dark/95 backdrop-blur border border-cyber-gray px-4 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3">
                 <div className="relative">
                    {/* Pulsing only when scanning (time left < 2) */}
                    {timeLeft <= 2 && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-20"></span>
                    )}
                    <Monitor className={timeLeft <= 2 ? "text-green-400" : "text-gray-500"} size={18} />
                 </div>
                 
                 <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analysis</span>
                        {timeLeft > 0 && (
                            <span className="text-[10px] font-mono text-cyber-accent flex items-center gap-1">
                                <Timer size={10} />
                                {timeLeft}s
                            </span>
                        )}
                    </div>
                    {/* Show simplified status */}
                    <span className="text-xs text-white/80 font-mono max-w-[150px] truncate">
                        {lastAnalysis || "Initializing..."}
                    </span>
                 </div>
            </div>

            <div className="h-6 w-px bg-cyber-gray mx-1"></div>

            <div className="text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Hits</div>
                <div className="text-xs font-mono text-white">{scanCount}</div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <div id="main-container-slot" className="relative">
          <div id="hit-panel-container" className="h-full w-full bg-cyber-black">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl text-white font-mono flex items-center gap-2">
                        <ScanEye size={20} className="text-cyber-red" />
                        Hit Panel
                    </h2>
                    <button 
                        onClick={handleOpenNewModal}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 px-3 py-1 rounded hover:border-gray-500 transition-colors"
                    >
                        <Plus size={14} /> Add Vector
                    </button>
                </div>

                <div className="masonry-grid">
                    {items.filter(i => i.isUnknown).map(item => (
                         <TrackItemCard 
                            key={item.id} 
                            item={item} 
                            allContexts={allContextList}
                            isActive={Date.now() - item.lastActive < (intervalTime * 1000) + 2000 && item.detectCount > 0}
                            onMoveHistoryItem={handleMoveHistoryItem}
                            onCreateFromHistory={handleCreateFromHistory}
                            onCopyLog={handleCopyProjectLog}
                        />
                    ))}
                    
                    {items.filter(i => !i.isUnknown).map(item => (
                         <TrackItemCard 
                            key={item.id} 
                            item={item} 
                            allContexts={allContextList}
                            isActive={Date.now() - item.lastActive < (intervalTime * 1000) + 2000 && item.detectCount > 0} 
                            onDelete={handleDeleteItem}
                            onMoveHistoryItem={handleMoveHistoryItem}
                            onCreateFromHistory={handleCreateFromHistory}
                            onCopyLog={handleCopyProjectLog}
                        />
                    ))}
                </div>
          </div>
      </div>

      {/* Fixed Bottom Total Time Footer */}
      <div className="fixed bottom-0 left-0 w-full bg-cyber-black/95 backdrop-blur border-t-2 border-green-500/50 shadow-[0_-5px_30px_rgba(34,197,94,0.15)] p-4 px-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-green-500/10 rounded-full">
                 <Timer className="text-green-500" size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest font-bold">Total Project Time</span>
                <span className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                    {formatTotalTime(totalFocusTime)}
                </span>
            </div>
        </div>

        <button
            onClick={() => setIsTimelineOpen(true)}
            className="group px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg flex items-center gap-2 transition-all font-mono text-sm hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        >
            <List size={16} />
            <span>View Timeline</span>
        </button>
      </div>

      <AddTrackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddItem}
        initialName={modalInitialName}
        initialDescription={modalInitialDesc}
      />

      <TimelineModal 
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        items={items}
      />
    </div>
  );
};

export default App;