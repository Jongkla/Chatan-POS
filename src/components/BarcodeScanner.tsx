import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { RefreshCcw, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onCameraError?: (error: string) => void;
}

let audioCtx: AudioContext | null = null;

const playBeep = () => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Barcode scanner beep profile (high pitch square wave, short duration)
    osc.type = 'square';
    osc.frequency.setValueAtTime(2700, audioCtx.currentTime);
    
    // Quick ramp up and down for a crisp beep
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (err) {
    console.error("Audio beep failed", err);
  }
};

export default function BarcodeScanner({ onScan, onCameraError }: BarcodeScannerProps) {
  const [lastScanned, setLastScanned] = useState({ code: '', time: 0 });
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializing = useRef(false);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    // Prevent scanning the same code multiple times quickly (debounce 1.5s)
    if (lastScanned.code === decodedText && now - lastScanned.time < 1500) {
      return;
    }
    
    playBeep();
    setLastScanned({ code: decodedText, time: now });
    
    onScan(decodedText);
  }, [lastScanned, onScan]);

  useEffect(() => {
    let isMounted = true;

    const initializeScanner = async () => {
      if (isInitializing.current || scannerRef.current) return;
      isInitializing.current = true;
      setHasError(false);

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (cameras && cameras.length > 0) {
          let cameraId = cameras[0].id;
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
          if (backCamera) {
            cameraId = backCamera.id;
          }

          scannerRef.current = new Html5Qrcode("reader");
          await scannerRef.current.start(
            cameraId,
            {
              fps: 15,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
            },
            handleScanSuccess,
            () => {} // Ignore parse errors
          );
        } else {
          setHasError(true);
          const errText = "No cameras found on this device.";
          setErrorMessage(errText);
          if (onCameraError) onCameraError(errText);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error starting scanner, falling back to primitive init", err);
        
        // Fallback: Just ask for environment without explicit device ID
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("reader");
          }
          await scannerRef.current.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
            },
            handleScanSuccess,
            () => {}
          );
          setHasError(false);
        } catch (fallbackErr: any) {
          if (!isMounted) return;
          console.error("Fallback scanner failed too", fallbackErr);
          setHasError(true);
          const errText = fallbackErr?.message || "Could not access the camera. Please ensure permissions are granted.";
          setErrorMessage(errText);
          if (onCameraError) onCameraError(errText);
        }
      } finally {
        isInitializing.current = false;
      }
    };

    // Small delay to ensure DOM is fully painted
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          }).catch(e => console.error("Failed to stop scanner", e));
        } else {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      }
    };
  }, [handleScanSuccess, onCameraError]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 overflow-hidden">
      <div className="w-full max-w-[400px] aspect-square rounded-3xl overflow-hidden border-4 border-indigo-500/20 shadow-2xl shadow-indigo-500/10 bg-black flex items-center justify-center relative">
        <div id="reader" className="w-full absolute inset-0"></div>
        
        {hasError ? (
          <div className="text-center p-6 z-10 w-full bg-black/90 h-full flex flex-col items-center justify-center backdrop-blur-md">
            <Camera className="text-slate-600 mb-3" size={32} />
            <span className="text-red-400 font-bold mb-2">Camera Access Required</span>
            <p className="text-xs text-slate-400 leading-relaxed text-center max-w-[250px]">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20 uppercase tracking-widest">Reload Page</button>
          </div>
        ) : (
          <>
            {/* Overlay to hide the "powered by html5-qrcode" watermark somewhat, although it might be deep in the DOM */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-black/30 rounded-3xl z-10" style={{boxShadow: 'inset 0 0 0 1000px rgba(0,0,0,0.3)', clipPath: 'polygon(0% 0%, 0% 100%, 15% 100%, 15% 30%, 85% 30%, 85% 70%, 15% 70%, 15% 100%, 100% 100%, 100% 0%)'}}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-2/5 border-2 border-indigo-500 rounded-lg pointer-events-none z-20 flex items-center justify-center">
               {/* Laser line inside target box */}
               <div className="w-full h-1 bg-red-500 opacity-80 shadow-[0_0_12px_3px_rgba(239,68,68,0.6)] animate-pulse"></div>
            </div>
            {/* Corner markers for aesthetics */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl pointer-events-none z-20"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl pointer-events-none z-20"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl pointer-events-none z-20"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl pointer-events-none z-20"></div>
          </>
        )}
      </div>
      
      {!hasError && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Continuous Scan Active
          </span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2 max-w-[250px]">Point the camera at an item's barcode to add it automatically.</p>
        </div>
      )}
    </div>
  );
}
