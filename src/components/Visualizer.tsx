import React, { useEffect, useRef, useState } from 'react';

export type VisualizerMode = 'bars' | 'waves' | 'particles' | 'none';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Request Microphone for real reaction
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;

    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
        }

        if (!sourceRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          if (analyserRef.current) {
            sourceRef.current.connect(analyserRef.current);
          }
          setHasAudioAccess(true);
        }
      } catch (err) {
        console.warn("Mic access denied or unavailable - using simulated reactivity", err);
        setHasAudioAccess(false);
      }
    };

    initAudio();

    return () => {
      // We keep the stream alive while visualizer is active to avoid re-permissioning
    };
  }, [mode, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === 'none') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener('resize', resize);
    resize();

    // Setup particles
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; color: string; o: number }[] = [];
    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 1,
          speedY: (Math.random() - 0.5) * 1,
          color: `hsla(${Math.random() * 360}, 70%, 60%, 0.5)`,
          o: Math.random()
        });
      }
    };
    initParticles();

    let frame = 0;
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      frame++;

      ctx.clearRect(0, 0, w, h);

      // Get frequency data
      let avgFreq = 0;
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        avgFreq = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      } else {
        // Simulated pulse based on time
        avgFreq = isPlaying ? 40 + Math.sin(frame * 0.1) * 20 + Math.sin(frame * 0.05) * 10 : 0;
      }

      const boost = (avgFreq / 128) * sensitivity; // 0 to 2 normalization * sensitivity
      
      // Theme colors
      const style = getComputedStyle(document.documentElement);
      const primary = style.getPropertyValue('--primary').trim() || 'oklch(0.6 0.2 320)';
      const accent = style.getPropertyValue('--accent').trim() || 'oklch(0.7 0.2 190)';

      if (mode === 'bars') {
        const barCount = 64;
        const barWidth = w / barCount;
        if (dataArrayRef.current && hasAudioAccess) {
          dataArrayRef.current.forEach((val, i) => {
            if (i >= barCount) return;
            const barH = (val / 255) * h * 0.8;
            ctx.fillStyle = i % 2 === 0 ? primary : accent;
            ctx.globalAlpha = 0.4 + (val / 255) * 0.6;
            ctx.fillRect(i * barWidth, h - barH, barWidth - 4, barH);
          });
        } else {
          // Simulated bars
          for (let i = 0; i < barCount; i++) {
            const noise = Math.sin(frame * 0.05 + i * 0.3) * 0.5 + 0.5;
            const barH = (noise * boost * h * 0.4) + 20;
            ctx.fillStyle = i % 2 === 0 ? primary : accent;
            ctx.globalAlpha = 0.2 + noise * 0.3;
            ctx.fillRect(i * barWidth, h - barH, barWidth - 2, barH);
          }
        }
      } else if (mode === 'waves') {
        ctx.beginPath();
        ctx.lineWidth = 4 + boost * 10;
        ctx.strokeStyle = primary;
        ctx.lineJoin = 'round';
        ctx.moveTo(0, h / 2);
        
        for (let i = 0; i < w; i += 5) {
          const sin = Math.sin(i * 0.01 + frame * 0.05);
          const cos = Math.cos(i * 0.02 - frame * 0.03);
          const y = h / 2 + (sin * 100 * boost) + (cos * 50 * boost);
          ctx.lineTo(i, y);
        }
        ctx.stroke();
        
        // Second wave
        ctx.beginPath();
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.5;
        ctx.moveTo(0, h / 2);
        for (let i = 0; i < w; i += 5) {
          const y = h / 2 + (Math.sin(i * 0.015 - frame * 0.04) * 80 * boost);
          ctx.lineTo(i, y);
        }
        ctx.stroke();
      } else if (mode === 'particles') {
        particles.forEach(p => {
          const pBoost = 1 + boost * 2;
          p.x += p.speedX * pBoost;
          p.y += p.speedY * pBoost;
          
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pBoost, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.2 + (boost * 0.5);
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
  }, [mode, isPlaying, hasAudioAccess]);

  if (mode === 'none') return null;

  return (
    <canvas 
      ref={canvasRef} 
      className={`fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${
        isDashboard ? 'opacity-80 z-0' : 'opacity-30 z-0'
      }`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default Visualizer;