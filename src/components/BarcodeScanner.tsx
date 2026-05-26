import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Camera, AlertCircle, ScanLine } from 'lucide-react';
import { BarcodeDetector as BarcodeDetectorPolyfill } from 'barcode-detector/pure';

export interface ScannedFood {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
  glycemicIndex: number;
  glycemicLoad: number;
}

interface Props {
  onResult: (food: ScannedFood) => void;
  onClose: () => void;
}

async function fetchFromOpenFoodFacts(barcode: string): Promise<ScannedFood> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) throw new Error('Product not found');
  const data = await res.json();
  if (data.status !== 1 || !data.product) throw new Error('Product not found in database');

  const p = data.product;
  const n = p.nutriments ?? {};

  return {
    name:          p.product_name || p.generic_name || `Barcode ${barcode}`,
    calories:      Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
    carbs:         Math.round((n['carbohydrates_100g'] ?? n.carbohydrates ?? 0) * 10) / 10,
    protein:       Math.round((n['proteins_100g'] ?? n.proteins ?? 0) * 10) / 10,
    fat:           Math.round((n['fat_100g'] ?? n.fat ?? 0) * 10) / 10,
    servingSize:   '100g',
    glycemicIndex: 0,
    glycemicLoad:  0,
  };
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [status,  setStatus]  = useState<'init' | 'scanning' | 'found' | 'error'>('init');
  const [error,   setError]   = useState('');
  const [manual,  setManual]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stopped = false;
    let detector: BarcodeDetectorPolyfill;

    (async () => {
      try {
        detector = new BarcodeDetectorPolyfill({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('scanning');

        async function scan() {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
            if (!stopped) rafRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stop();
              setStatus('found');
              setLoading(true);
              try {
                const food = await fetchFromOpenFoodFacts(codes[0].rawValue);
                onResult(food);
              } catch {
                setError(`Barcode "${codes[0].rawValue}" not found in Open Food Facts. Enter it manually below.`);
                setStatus('error');
              } finally {
                setLoading(false);
              }
              return;
            }
          } catch { /* detection frame error, continue */ }
          if (!stopped) rafRef.current = requestAnimationFrame(scan);
        }
        rafRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        const msg = err?.name === 'NotAllowedError'
          ? 'Camera access denied. Allow camera access in your browser settings, or enter the barcode number below.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device. Enter the barcode number below.'
          : (err?.message || 'Camera error. Enter the barcode manually below.');
        setError(msg);
        setStatus('error');
      }
    })();

    function stop() {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
    return () => stop();
  }, []);

  async function lookupManual() {
    const code = manual.trim();
    if (!code) return;
    setLoading(true); setError('');
    try {
      const food = await fetchFromOpenFoodFacts(code);
      onResult(food);
    } catch {
      setError('Barcode not found in Open Food Facts database. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanLine size={16} style={{ color: 'var(--blue)' }} /> Scan Barcode
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        {(status === 'init' || status === 'scanning') && (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            {status === 'scanning' && (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '70%', height: '35%',
                    border: '2px solid var(--blue)', borderRadius: 8,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
                  }} />
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
                  Point the barcode at the box
                </div>
              </>
            )}
            {status === 'init' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: 12 }}>Starting camera…</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Found / loading */}
        {status === 'found' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Loader2 size={28} className="spin" style={{ color: 'var(--blue)', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Looking up product…</div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 13, color: '#fca5a5' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Manual entry — always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={12} /> Or enter barcode number manually
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="inp"
              placeholder="e.g. 8901234567890"
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupManual()}
              inputMode="numeric"
            />
            <button
              onClick={lookupManual}
              disabled={!manual.trim() || loading}
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
            >
              {loading ? <Loader2 size={14} className="spin" /> : 'Look up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
