import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, RefreshCcw, ShoppingCart, Trash2 } from 'lucide-react';
import { CartItem } from '../lib/api';

interface BarcodeScannerProps {
  onScan: (barcode: string, isContinuous: boolean) => void;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
}

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    console.error("Audio beep failed", err);
  }
};

export default function BarcodeScanner({ onScan, onClose, cart, onUpdateQuantity, onRemoveFromCart }: BarcodeScannerProps) {
  const [isContinuous, setIsContinuous] = useState(false);
  const [lastScanned, setLastScanned] = useState({ code: '', time: 0 });
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializing = useRef(false);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    // Prevent scanning the same code multiple times quickly
    if (lastScanned.code === decodedText && now - lastScanned.time < 2000) {
      return;
    }
    
    playBeep();
    setLastScanned({ code: decodedText, time: now });
    
    onScan(decodedText, isContinuous);
  }, [lastScanned, isContinuous, onScan]);

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
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
            },
            handleScanSuccess,
            () => {} // Ignore parse errors
          );
        } else {
          setHasError(true);
          setErrorMessage("No cameras found on this device.");
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
              fps: 10,
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
          setErrorMessage(fallbackErr?.message || "Could not access the camera. Please ensure permissions are granted.");
        }
      } finally {
        isInitializing.current = false;
      }
    };

    // Small delay to ensure the modal DOM is fully painted
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 100);

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
  }, [handleScanSuccess]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm shadow-2xl">
      <div className={`bg-white dark:bg-slate-800 w-full max-w-md ${isContinuous ? 'h-[90vh]' : ''} rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300`}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[12px]">Scan Barcode</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className={`p-6 flex flex-col gap-5 items-center ${isContinuous ? 'pb-4 shrink-0' : ''}`}>
          <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border-2 border-primary-500 shadow-inner bg-black flex items-center justify-center relative">
            <div id="reader" className="w-full absolute inset-0"></div>
            
            {hasError ? (
              <div className="text-center p-4 z-10 w-full bg-black/80 h-full flex flex-col items-center justify-center backdrop-blur-sm">
                <span className="text-red-500 font-bold mb-2">Camera Error</span>
                <p className="text-xs text-slate-300">{errorMessage}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700">Reload Page</button>
              </div>
            ) : (
              <>
                {/* Overlay to hide the "powered by html5-qrcode" watermark somewhat, although it might be deep in the DOM */}
                <div className="absolute inset-0 pointer-events-none border-4 border-black/10 rounded-xl z-10" style={{boxShadow: 'inset 0 0 0 1000px rgba(0,0,0,0.4)', clipPath: 'polygon(0% 0%, 0% 100%, 15% 100%, 15% 30%, 85% 30%, 85% 70%, 15% 70%, 15% 100%, 100% 100%, 100% 0%)'}}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-2/5 border-2 border-primary-500 rounded-lg pointer-events-none z-100">
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-red-500 opacity-50 shadow-[0_0_8px_2px_rgba(239,68,68,0.5)]"></div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">Center the barcode inside the frame</p>
            
            <label className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer w-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={isContinuous} onChange={(e) => setIsContinuous(e.target.checked)} />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Continuous Mode</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scan multiple items rapidly</span>
              </div>
            </label>
          </div>
        </div>

        {isContinuous && (
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-white dark:bg-slate-800">
              <h2 className="font-bold flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
                <ShoppingCart size={14} /> Scanned Items
              </h2>
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-2">
                  <ShoppingCart size={32} />
                  <p className="text-[10px] uppercase tracking-widest font-bold">Cart is empty</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-2.5 relative shadow-sm">
                      <button onClick={() => onRemoveFromCart(item.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
                        <Trash2 size={12} />
                      </button>
                      <div className="pr-6">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">{item.name}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="font-black text-primary-600 dark:text-primary-400 text-[11px]">₱{(item.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-md p-0.5 shadow-inner">
                          <button onClick={() => onUpdateQuantity(item.id, -1)} className="text-slate-500 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-800 w-5 h-5 flex items-center justify-center rounded font-black leading-none -mt-0.5"><span className="text-sm">-</span></button>
                          <span className="w-5 text-center font-bold text-slate-900 dark:text-slate-100 text-[10px]">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} className="text-slate-500 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-800 w-5 h-5 flex items-center justify-center rounded font-black leading-none -mt-0.5"><span className="text-sm">+</span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
               <div className="flex items-center justify-between">
                 <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400">Total</span>
                 <span className="text-primary-600 dark:text-primary-400 text-lg font-black">₱{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
