import { useState } from 'react';

const Popup = () => {
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
  };

  return (
    <div className="w-64 p-6 bg-gray-900 text-white font-sans rounded-lg">
      <h1 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">DemoLens</h1>
      <p className="text-sm text-gray-400 mb-6">Privacy-first screen recorder</p>
      
      <button
        onClick={handleStartRecording}
        disabled={isRecording}
        className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-300 ${
          isRecording 
            ? 'bg-red-500/20 text-red-400 cursor-not-allowed border border-red-500/50'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
        }`}
      >
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
    </div>
  );
};

export default Popup;
