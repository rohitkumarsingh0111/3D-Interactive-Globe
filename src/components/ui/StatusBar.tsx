'use client';

// src/components/ui/StatusBar.tsx
import { useEffect, useRef, useState } from 'react';

export default function StatusBar() {
  const [fps, setFps] = useState(60);
  const frameRef = useRef(0);
  const lastRef  = useRef(performance.now());

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      frameRef.current++;
      const now = performance.now();
      if (now - lastRef.current >= 1000) {
        setFps(frameRef.current);
        frameRef.current = 0;
        lastRef.current  = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const fpsColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-item">
        <span className="status-key">SYS</span>
        <span className="status-val" style={{ color: fpsColor }}>{fps} FPS</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">NODES</span>
        <span className="status-val">4 ACTIVE</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">SIGNAL</span>
        <span className="status-val" style={{ color: '#4ade80' }}>STRONG</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">NET</span>
        <span className="status-val">14.2K ONLINE</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">VER</span>
        <span className="status-val">2.6.1</span>
      </div>
    </footer>
  );
}
