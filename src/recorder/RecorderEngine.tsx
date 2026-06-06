import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { Point } from '../store/useStore';
import { Loader2 } from 'lucide-react';

const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

const RecorderEngine = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isRecording, isProcessing, setIsRecording, setIsProcessing, addMousePoint, addClick, resetStore } = useStore();

  useEffect(() => {
    chrome.storage.local.set({ isRecording, isProcessing });
  }, [isRecording, isProcessing]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'STOP_RECORDING') {
        stopCapture();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startCapture();
    return () => stopCapture();
  }, []);

  const startCapture = async () => {
    try {
      resetStore();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60, max: 60 } },
        audio: false,
      });

      const options = { mimeType: 'video/webm; codecs=vp9' };
      let mediaRecorder: MediaRecorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorder = new MediaRecorder(stream, options);
      } else {
        mediaRecorder = new MediaRecorder(stream); // Fallback
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        processVideo();
      };

      startTimeRef.current = Date.now();
      chrome.storage.local.set({ recordingStartTime: startTimeRef.current });
      
      const handleMouseMove = (e: MouseEvent) => {
        addMousePoint({ x: e.clientX, y: e.clientY, time: Date.now() - startTimeRef.current });
      };

      const handleMouseClick = (e: MouseEvent) => {
        addClick({ x: e.clientX, y: e.clientY, time: Date.now() - startTimeRef.current });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('click', handleMouseClick);

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('click', handleMouseClick);
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Error starting capture: ", err);
    }
  };

  const stopCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      chrome.storage.local.set({ recordingStartTime: null });
    }
  };

  const getZoomFactor = (time: number, clickPoints: Point[]): { scale: number, center: {x: number, y: number} | null } => {
    let currentScale = 1;
    let center = null;
    let maxWeight = 0;

    for (const click of clickPoints) {
      const diff = Math.abs(time - click.time);
      if (diff < 1000) {
        const norm = diff / 1000;
        const weight = 1 - norm; 
        if (weight > maxWeight) {
          maxWeight = weight;
          center = { x: click.x, y: click.y };
        }
      }
    }

    if (maxWeight > 0) {
      currentScale = lerp(1, 1.5, maxWeight);
    }

    return { scale: currentScale, center };
  };

  const processVideo = async () => {
    setIsProcessing(true);
    
    // Bring this tab to the foreground so requestAnimationFrame runs at 60fps instead of being throttled!
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id) {
        chrome.tabs.update(tab.id, { active: true });
      }
    });

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);
    
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          startExportStream();
        }
      };
    }
  };

  const startExportStream = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // Fetch user preferences for processing
    const prefs = await chrome.storage.local.get(['autoZoom', 'smoothCursor']);
    const enableZoom = prefs.autoZoom !== false;
    const enableCursor = prefs.smoothCursor !== false;

    const stream = canvas.captureStream(60);
    const options = { mimeType: 'video/webm; codecs=vp9' };
    let exportRecorder: MediaRecorder;
    if (MediaRecorder.isTypeSupported(options.mimeType)) {
      exportRecorder = new MediaRecorder(stream, options);
    } else {
      exportRecorder = new MediaRecorder(stream);
    }
    
    const exportChunks: Blob[] = [];

    exportRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) exportChunks.push(e.data);
    };

    exportRecorder.onstop = () => {
      const finalBlob = new Blob(exportChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(finalBlob);
      
      // Use chrome.downloads API to trigger download reliably from an extension page
      chrome.downloads.download({
        url: url,
        filename: 'demolens-final.webm',
        saveAs: true // Prompts user to pick Desktop or elsewhere
      }, () => {
        setIsProcessing(false);
        // Revoke after a delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        window.close();
      });
    };

    exportRecorder.start();
    video.play();
    
    let lastMouseIdx = 0;
    const storeMousePath = useStore.getState().mousePath;
    const storeClicks = useStore.getState().clicks;

    const renderLoop = () => {
      if (!video.paused && !video.ended) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const currentTimeMs = video.currentTime * 1000;

          ctx.save();
          ctx.clearRect(0, 0, width, height);

          // Apply auto-zoom based on preferences
          if (enableZoom) {
            const zoom = getZoomFactor(currentTimeMs, storeClicks);
            if (zoom.scale > 1 && zoom.center) {
              const cx = zoom.center.x;
              const cy = zoom.center.y;
              ctx.translate(cx, cy);
              ctx.scale(zoom.scale, zoom.scale);
              ctx.translate(-cx, -cy);
            }
          }

          // Draw the video frame
          ctx.drawImage(video, 0, 0, width, height);

          // Draw interpolated cursor based on preferences
          if (enableCursor) {
            while (lastMouseIdx < storeMousePath.length - 1 && storeMousePath[lastMouseIdx + 1].time < currentTimeMs) {
               lastMouseIdx++;
            }
            
            let currentPos = null;
            if (storeMousePath.length > 0) {
              if (currentTimeMs <= storeMousePath[0].time) {
                currentPos = { x: storeMousePath[0].x, y: storeMousePath[0].y };
              } else if (currentTimeMs >= storeMousePath[storeMousePath.length - 1].time) {
                const last = storeMousePath[storeMousePath.length - 1];
                currentPos = { x: last.x, y: last.y };
              } else {
                const p1 = storeMousePath[lastMouseIdx];
                const p2 = storeMousePath[lastMouseIdx + 1];
                const t = (currentTimeMs - p1.time) / (p2.time - p1.time);
                currentPos = {
                  x: lerp(p1.x, p2.x, t),
                  y: lerp(p1.y, p2.y, t)
                };
              }
            }

            if (currentPos) {
               ctx.beginPath();
               ctx.moveTo(currentPos.x, currentPos.y);
               ctx.lineTo(currentPos.x + 15, currentPos.y + 15);
               ctx.lineTo(currentPos.x + 5, currentPos.y + 15);
               ctx.lineTo(currentPos.x + 5, currentPos.y + 25);
               ctx.lineTo(currentPos.x - 2, currentPos.y + 25);
               ctx.lineTo(currentPos.x - 2, currentPos.y + 15);
               ctx.lineTo(currentPos.x - 9, currentPos.y + 15);
               ctx.closePath();
               
               ctx.fillStyle = 'rgba(0,0,0,0.8)';
               ctx.fill();
               ctx.lineWidth = 1;
               ctx.strokeStyle = 'white';
               ctx.stroke();

               ctx.beginPath();
               ctx.moveTo(currentPos.x, currentPos.y);
               ctx.lineTo(currentPos.x + 10, currentPos.y + 10);
               ctx.lineTo(currentPos.x + 3, currentPos.y + 10);
               ctx.lineTo(currentPos.x, currentPos.y + 16);
               ctx.closePath();
               ctx.fillStyle = 'white';
               ctx.fill();
            }
          }

          ctx.restore();
        }
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      } else if (video.ended) {
        exportRecorder.stop();
      } else {
         animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center text-white font-sans overflow-hidden" 
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
      
      {/* Hidden elements */}
      <div style={{ display: 'none' }}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center space-y-6">
           <div className="relative">
             <div className="absolute inset-0 bg-indigo-500 blur-[64px] opacity-50 rounded-full animate-pulse w-32 h-32"></div>
             <Loader2 className="w-20 h-20 text-indigo-400 animate-spin relative z-10" />
           </div>
           <div className="text-center z-10">
             <h2 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent tracking-tight">Rendering Magic...</h2>
             <p className="text-xl text-indigo-200/70 mt-3">Applying cinematic effects at 60 FPS.</p>
           </div>
        </div>
      ) : (
        <div className="text-indigo-200/40 text-sm tracking-widest uppercase">DemoLens Engine (Idle)</div>
      )}
    </div>
  );
};

export default RecorderEngine;
