'use client';

// src/components/ui/EventPopup.tsx
// Premium spatial UI popup — targeting brackets, coordinates,
// signal bars, animated stat tiles, holographic glow layers

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobeStore } from '@/store/globeStore';
import { GlobeEvent } from '@/types/globe';

/* ── Animated user count ticker ───────────────────────────── */
function UserCounter({ value }: { value: string }) {
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const num = parseFloat(value.replace('K', '')) * (value.includes('K') ? 1000 : 1);
    let start = 0;
    const step = num / 28;
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setDisplay(value); clearInterval(timer); return; }
      const v = start >= 1000 ? (start / 1000).toFixed(1) + 'K' : Math.floor(start).toString();
      setDisplay(v);
    }, 32);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

/* ── Signal-strength bars ─────────────────────────────────── */
function SignalBars({ strength = 4 }: { strength?: number }) {
  const heights = [5, 8, 12, 16, 20];
  return (
    <div className="signal-bars" aria-label={`Signal strength ${strength}/5`}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="signal-bar"
          style={{
            height: h,
            opacity: i < strength ? 1 : 0.18,
            background: i < strength ? (i < 3 ? '#00FFFF' : '#A855F7') : '#fff',
          }}
        />
      ))}
    </div>
  );
}

/* ── Popup card ───────────────────────────────────────────── */
interface PopupCardProps { event: GlobeEvent; onClose: () => void; }

function PopupCard({ event, onClose }: PopupCardProps) {
  const latLabel = event.lat >= 0
    ? `${event.lat.toFixed(2)}°N`
    : `${Math.abs(event.lat).toFixed(2)}°S`;
  const lngLabel = event.lng >= 0
    ? `${event.lng.toFixed(2)}°E`
    : `${Math.abs(event.lng).toFixed(2)}°W`;

  return (
    <div className="sp-card" role="dialog" aria-modal="true" aria-label={event.name}>

      {/* Animated rotating gradient border ring */}
      <div className="sp-border-ring" aria-hidden="true" />

      {/* Corner targeting brackets */}
      <div className="sp-corner sp-corner-tl" aria-hidden="true" />
      <div className="sp-corner sp-corner-tr" aria-hidden="true" />
      <div className="sp-corner sp-corner-bl" aria-hidden="true" />
      <div className="sp-corner sp-corner-br" aria-hidden="true" />

      {/* ── Top bar: signal + close ── */}
      <div className="sp-topbar">
        <div className="sp-signal-row">
          <SignalBars strength={4} />
          <span className="sp-signal-label">STRONG SIGNAL</span>
        </div>
        <button className="sp-close" onClick={onClose} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Live badge ── */}
      <div className="sp-live-row">
        <div className="sp-live-badge">
          <span className="sp-live-ring" aria-hidden="true" />
          <span className="sp-live-dot"  aria-hidden="true" />
          BROADCASTING LIVE
        </div>
        <div className="sp-uptime">UPTIME 99.9%</div>
      </div>

      {/* ── Event name (hero text) ── */}
      <div className="sp-name">{event.name}</div>

      {/* ── Coordinates + location ── */}
      <div className="sp-coords-row">
        <div className="sp-coords-block">
          <div className="sp-coords-label">COORDINATES</div>
          <div className="sp-coords-value">
            <span>{latLabel}</span>
            <span className="sp-coords-sep">/</span>
            <span>{lngLabel}</span>
          </div>
        </div>
        <div className="sp-location-block">
          <div className="sp-coords-label">LOCATION</div>
          <div className="sp-location-value">
            <svg width="9" height="11" viewBox="0 0 24 28" fill="none"
              stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 0C7.6 0 4 3.6 4 8c0 5.8 8 20 8 20s8-14.2 8-20c0-4.4-3.6-8-8-8z"/>
              <circle cx="12" cy="8" r="3" fill="currentColor" stroke="none"/>
            </svg>
            {event.city}, {event.country}
          </div>
        </div>
      </div>

      {/* ── Divider with scanning line ── */}
      <div className="sp-divider">
        <div className="sp-scan-line" aria-hidden="true" />
      </div>

      {/* ── Stat tiles ── */}
      <div className="sp-stats">
        <div className="sp-stat sp-stat-primary">
          <div className="sp-stat-icon">👥</div>
          <div className="sp-stat-val">
            <UserCounter value={event.users} />
          </div>
          <div className="sp-stat-key">ACTIVE USERS</div>
          <div className="sp-stat-trend">↑ 12%</div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-icon">📡</div>
          <div className="sp-stat-val sp-stat-green">LIVE</div>
          <div className="sp-stat-key">STATUS</div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-icon">🏷</div>
          <div className="sp-stat-val sp-stat-purple">{event.category}</div>
          <div className="sp-stat-key">CATEGORY</div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-icon">⏱</div>
          <div className="sp-stat-val">{event.duration}</div>
          <div className="sp-stat-key">DURATION</div>
        </div>
      </div>

      {/* ── CTA button ── */}
      <button className="sp-cta">
        <span>JOIN EVENT</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>

      {/* Scanline overlay */}
      <div className="sp-scanlines" aria-hidden="true" />
    </div>
  );
}

/* ── Root export ──────────────────────────────────────────── */
export default function EventPopup() {
  const activeEvent    = useGlobeStore((s) => s.activeEvent);
  const popupScreen    = useGlobeStore((s) => s.popupScreen);
  const setActiveEvent = useGlobeStore((s) => s.setActiveEvent);
  const cardRef        = useRef<HTMLDivElement>(null);
  const [pos, setPos]  = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!activeEvent || !cardRef.current) return;
    const cW = cardRef.current.offsetWidth  || 300;
    const cH = cardRef.current.offsetHeight || 380;
    const vW = window.innerWidth;
    const vH = window.innerHeight;

    let x = popupScreen.x - cW / 2;
    let y = popupScreen.y - cH - 22;

    if (x < 12)           x = 12;
    if (x + cW > vW - 12) x = vW - cW - 12;
    if (y < 72)           y = popupScreen.y + 22;
    if (y + cH > vH - 60) y = popupScreen.y - cH - 22;

    setPos({ x, y });
  }, [activeEvent, popupScreen]);

  return (
    <AnimatePresence>
      {activeEvent && (
        <motion.div
          key={activeEvent.id}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.88, y: 16, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
          exit={{    opacity: 0, scale: 0.88, y: 16, filter: 'blur(4px)' }}
          transition={{ duration: 0.32, ease: [0.34, 1.1, 0.64, 1] }}
          style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 200 }}
        >
          <PopupCard event={activeEvent} onClose={() => setActiveEvent(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
