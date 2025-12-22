import React, { useEffect, useRef } from 'react';

export type VisualizerMode = 'bars' | 'waves' | 'particles' | 'none';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === 'none') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener('resize', resize);
    resize();

    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; color: string }[] = [];
    if (mode === 'particles') {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 2,
          speedY: (Math.random() - 0.5) * 2,
          color: `hsla(${Math.random() * 360}, 70%, 60%, 0.5)`
        });
      }
    }

    const draw = () => {
      if (!isPlaying) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      frameRef.current++;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Get Primary color from theme
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'oklch(0.6 0.2 250)';

      if (mode === 'bars') {
        const barCount = 40;
        const barWidth = w / barCount;
        for (let i = 0; i < barCount; i++) {
          const amplitude = Math.sin(frameRef.current * 0.05 + i * 0.2) * 0.5 + 0.5;
          const barHeight = 20 + amplitude * (h * 0.6);
          ctx.fillStyle = primaryColor;
          ctx.globalAlpha = 0.3 + amplitude * 0.4;
          ctx.fillRect(i * barWidth, h - barHeight, barWidth - 2, barHeight);
        }
      } else if (mode === 'waves') {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = primaryColor;
        ctx.moveTo(0, h / 2);
        for (let i = 0; i < w; i++) {
          const amplitude = Math.sin(frameRef.current * 0.03 + i * 0.01) * 50;
          const secondWave = Math.cos(frameRef.current * 0.02 + i * 0.02) * 30;
          ctx.lineTo(i, h / 2 + amplitude + secondWave);
        }
        ctx.stroke();
      } else if (mode === 'particles') {
        particles.forEach(p => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0 || p.x > w) p.speedX *= -1;
          if (p.y < 0 || p.y > h) p.speedY *= -1;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mode, isPlaying]);

  if (mode === 'none') return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default Visualizer;
