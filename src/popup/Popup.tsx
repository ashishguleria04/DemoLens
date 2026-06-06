import { useState, useEffect } from 'react';
import { Video, Square, Loader2, CheckCircle, ShieldCheck, Settings2, MousePointer2, ZoomIn } from 'lucide-react';

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Popup = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [autoZoom, setAutoZoom] = useState(true);
  const [smoothCursor, setSmoothCursor] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'isProcessing', 'recordingStartTime', 'autoZoom', 'smoothCursor'], (result) => {
      setIsRecording(!!result.isRecording);
      setIsProcessing(!!result.isProcessing);
      if (result.recordingStartTime) setRecordingStartTime(result.recordingStartTime);
      if (result.autoZoom !== undefined) setAutoZoom(result.autoZoom);
      if (result.smoothCursor !== undefined) setSmoothCursor(result.smoothCursor);
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.isRecording) setIsRecording(changes.isRecording.newValue);
      if (changes.isProcessing) {
        setIsProcessing(changes.isProcessing.newValue);
        if (changes.isProcessing.oldValue && !changes.isProcessing.newValue) {
          setJustFinished(true);
          setTimeout(() => setJustFinished(false), 3000);
        }
      }
      if (changes.recordingStartTime !== undefined) {
        setRecordingStartTime(changes.recordingStartTime.newValue || null);
      }
    };
    
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRecording && recordingStartTime) {
      // Immediate update
      setElapsedTime(Date.now() - recordingStartTime);
      interval = setInterval(() => {
        setElapsedTime(Date.now() - recordingStartTime);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const handleStartRecording = () => {
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
  };

  const handleStopRecording = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };

  const toggleAutoZoom = () => {
    const next = !autoZoom;
    setAutoZoom(next);
    chrome.storage.local.set({ autoZoom: next });
  };

  const toggleSmoothCursor = () => {
    const next = !smoothCursor;
    setSmoothCursor(next);
    chrome.storage.local.set({ smoothCursor: next });
  };

  return (
    <div className="w-[350px] min-h-[400px] p-6 text-white font-sans flex flex-col justify-between relative overflow-hidden transition-all duration-500" 
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
         
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-[64px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-[64px] opacity-30 pointer-events-none"></div>

      <div className="relative z-10 flex-grow flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent tracking-tight">
              DemoLens
            </h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            disabled={isRecording || isProcessing}
            className={`p-2 rounded-full transition-all duration-300 active:scale-95 ${
              showSettings ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
            } ${(isRecording || isProcessing) ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Settings2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && !isRecording && !isProcessing && (
          <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transition-all">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Rendering Engine</h3>
            
            <div className="flex items-center justify-between mb-4 group cursor-pointer" onClick={toggleAutoZoom}>
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-200">Auto-Zoom on Clicks</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${autoZoom ? 'bg-blue-500' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${autoZoom ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div className="flex items-center justify-between group cursor-pointer" onClick={toggleSmoothCursor}>
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                  <MousePointer2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-200">Smooth Cursor Path</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${smoothCursor ? 'bg-purple-500' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${smoothCursor ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Status Area */}
        <div className="flex-grow flex flex-col items-center justify-center py-4">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4 transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-40 rounded-full animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-indigo-300 animate-spin relative z-10" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">Rendering Magic...</h2>
                <p className="text-xs text-indigo-300/70 mt-1">Applying cinematic effects</p>
              </div>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center space-y-4 transition-all duration-500">
              <div className="text-6xl font-mono font-light text-white drop-shadow-md tracking-wider">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest">Recording</span>
              </div>
            </div>
          ) : justFinished ? (
            <div className="flex flex-col items-center space-y-3 transition-all duration-500">
              <div className="bg-green-500/20 p-4 rounded-full border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-green-50">Saved Successfully!</h2>
            </div>
          ) : !showSettings && (
            <div className="text-center space-y-2 transition-all duration-500">
              <p className="text-indigo-200/80 text-sm leading-relaxed max-w-[250px] mx-auto">
                Ready to capture? We'll track your clicks and smooth your cursor automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Button & Footer */}
      <div className="relative z-10 mt-auto pt-4">
        {!isProcessing && !justFinished && (
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest flex items-center justify-center space-x-2 transition-all duration-300 shadow-xl active:scale-95 ${
              isRecording 
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-red-500/30 border border-red-400/50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 border border-blue-400/50'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 opacity-90" fill="currentColor" />
                <span>FINISH CAPTURE</span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                <span>START RECORDING</span>
              </>
            )}
          </button>
        )}

        {/* Privacy Badge */}
        <div className="mt-5 flex items-center justify-center space-x-1.5 opacity-60 hover:opacity-100 transition-opacity">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-200">Privacy First • Local Processing</span>
        </div>
      </div>
    </div>
  );
};

export default Popup;
