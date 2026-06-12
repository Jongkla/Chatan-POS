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
        scannerRef.current = new Html5Qrcode("reader");
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };
        
        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          handleScanSuccess,
          () => {} // undefined fails on some versions
        );
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Scanner fallback failed", err);
        setHasError(true);
        const errText = err?.message || "Could not access the camera. Please ensure permissions are granted.";
        setErrorMessage(errText);
        if (onCameraError) onCameraError(errText);
      } finally {
        isInitializing.current = false;
      }
    };

    // Small delay to ensure DOM is fully painted
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              if (scannerRef.current) {
                try { scannerRef.current.clear(); } catch(e) {}
                scannerRef.current = null;
              }
            }).catch(e => {
              console.error("Failed to stop scanner", e);
              if (scannerRef.current) {
                try { scannerRef.current.clear(); } catch(e) {}
                scannerRef.current = null;
              }
            });
          } else {
            try { scannerRef.current.clear(); } catch(e) {}
            scannerRef.current = null;
          }
        } catch (err) {
          console.error("Error during scanner cleanup", err);
        }
      }
    };
  }, [handleScanSuccess, onCameraError]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 overflow-hidden">
      <div className="w-full max-w-[500px] aspect-square rounded-3xl overflow-hidden border-4 border-indigo-500/20 shadow-2xl shadow-indigo-500/10 bg-black flex items-center justify-center relative [&_video]:object-cover">
        <div id="reader" className="absolute inset-0 z-0 w-full h-full flex flex-col items-center justify-center bg-black"></div>
        
        {hasError && (
          <div className="absolute inset-0 z-10 w-full bg-black/90 flex flex-col items-center justify-center backdrop-blur-md p-6">
            <Camera className="text-slate-600 mb-3" size={32} />
            <span className="text-red-400 font-bold mb-2">Camera Access Required</span>
            <p className="text-xs text-slate-400 leading-relaxed text-center max-w-[250px]">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20 uppercase tracking-widest">Reload Page</button>
          </div>
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
