import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rotation: number; vr: number;
  color: string;
  opacity: number;
}

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function useCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'celebration-canvas';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
      canvas.remove();
    };
  }, []);

  const fire = useCallback((intensity: 'small' | 'big' = 'big') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const count = intensity === 'big' ? 180 : 70;

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 1,
      w: Math.random() * 10 + 4,
      h: Math.random() * 5 + 2,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1,
    }));

    cancelAnimationFrame(frameRef.current);

    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = false;
      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.08;
        p.rotation += p.vr;
        if (p.y > canvas!.height * 0.75) p.opacity -= 0.025;
        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (alive) frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  return { fire };
}

interface ToastProps {
  message: string;
  emoji?: string;
  color?: string;
  onDone: () => void;
}

export function CelebrationToast({ message, emoji = '🎉', color = 'var(--green)', onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="pop-in"
      style={{
        position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9998,
        background: 'var(--card)', border: `2px solid ${color}`,
        borderRadius: 16, padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: `0 8px 32px rgba(0,0,0,.4), 0 0 0 1px ${color}44`,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 28 }} className="streak-fire">{emoji}</span>
      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{message}</span>
    </div>
  );
}
