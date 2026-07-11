'use client';

// src/components/ui/Header.tsx
import { useState } from 'react';

const NAV_ITEMS = ['Globe', 'Events', 'Analytics', 'Network'];

export default function Header() {
  const [active, setActive] = useState('Globe');

  return (
    <header className="hdr">
      {/* Logo */}
      <div className="hdr-logo">
        <div className="hdr-logo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00FFFF" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2"  y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <div className="hdr-logo-text">
          3D Interactive Globe
        </div>
      </div>

      {/* Nav */}
      <nav className="hdr-nav" role="navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            className={`hdr-nav-pill${active === item ? ' active' : ''}`}
            onClick={() => setActive(item)}
            aria-current={active === item ? 'page' : undefined}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Live events badge */}
      <div className="hdr-right">
        <div className="live-badge" role="status" aria-live="polite">
          <div className="live-dot" />
          <span>4 LIVE EVENTS</span>
        </div>
      </div>
    </header>
  );
}
