'use client';

// src/components/ui/StatusBar.tsx
import { useEffect, useRef, useState } from 'react';
import type { GlobeEvent } from '@/types/globe';

interface StatusBarProps { events?: GlobeEvent[]; worldEvents?: GlobeEvent[]; }

function parseUsers(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (/k/i.test(s)) return Math.round(n * 1000);
  if (/m/i.test(s)) return Math.round(n * 1_000_000);
  return Math.round(n) || 0;
}
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000)      return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function StatusBar({ events = [], worldEvents = [] }: StatusBarProps) {
  const [fps, setFps]   = useState(60);
  const frameRef        = useRef(0);
  const lastRef         = useRef(performance.now());

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

  const fpsColor   = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';
  const totalUsers = events.reduce((s, e) => s + parseUsers(e.users), 0);
  const totalNodes = events.length + worldEvents.length;

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-item">
        <span className="status-key">SYS</span>
        <span className="status-val" style={{ color: fpsColor }}>{fps} FPS</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">NODES</span>
        <span className="status-val">{totalNodes} ACTIVE</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">🌍 WORLD</span>
        <span className="status-val" style={{ color: '#A855F7' }}>{worldEvents.length}</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">ONLINE</span>
        <span className="status-val" style={{ color: '#4ade80' }}>{fmt(totalUsers)}</span>
      </div>
      <div className="status-div" />
      <div className="status-item">
        <span className="status-key">SIGNAL</span>
        <span className="status-val" style={{ color: '#4ade80' }}>STRONG</span>
      </div>
    </footer>
  );
}
