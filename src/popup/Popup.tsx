import { useState, useEffect } from 'react';
import { Video, Square, Loader2, CheckCircle } from 'lucide-react';

const Popup = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    // Initial fetch from the single source of truth
    chrome.storage.local.get(['isRecording', 'isProcessing'], (result) => {
      setIsRecording(!!result.isRecording);
      setIsProcessing(!!result.isProcessing);
    });

    // Listen for state changes from the engine tab
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.isRecording) {
        setIsRecording(changes.isRecording.newValue);
      }
      if (changes.isProcessing) {
        setIsProcessing(changes.isProcessing.newValue);
        // If processing just turned false, show a quick success state
        if (changes.isProcessing.oldValue && !changes.isProcessing.newValue) {
          setJustFinished(true);
          setTimeout(() => setJustFinished(false), 3000);
        }
      }
    };
    
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleStartRecording = () => {
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
  };

  const handleStopRecording = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };

  return (
    <div className="w-72 p-6 bg-gray-900 text-white font-sans rounded-lg shadow-xl border border-gray-800">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/30">
          <Video className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          DemoLens
        </h1>
      </div>
      
      <p className="text-sm text-gray-400 mb-6">
        Privacy-first, cinematic screen recordings.
      </p>

      {isProcessing ? (
        <div className="w-full py-3 px-4 rounded-md font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing Video...</span>
        </div>
      ) : isRecording ? (
        <button
          onClick={handleStopRecording}
          className="w-full py-3 px-4 rounded-md font-medium transition-all duration-300 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 flex items-center justify-center space-x-2 shadow-lg shadow-red-500/20 group"
        >
          <span className="relative flex h-3 w-3 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span>Stop Recording</span>
          <Square className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={handleStartRecording}
          className="w-full py-3 px-4 rounded-md font-medium transition-all duration-300 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
        >
          {justFinished ? (
             <>
               <CheckCircle className="w-5 h-5 text-green-300" />
               <span className="text-green-100">Saved Successfully!</span>
             </>
          ) : (
             <>
               <Video className="w-5 h-5" />
               <span>Start Recording</span>
             </>
          )}
        </button>
      )}
    </div>
  );
};

export default Popup;
