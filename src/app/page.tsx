'use client';

// src/app/page.tsx
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useGlobeStore } from '@/store/globeStore';
import type { GlobeEvent } from '@/types/globe';
import { GLOBE_EVENTS as STATIC_FALLBACK } from '@/data/events';

import Header, { type NavTab } from '@/components/ui/Header';
import StatusBar     from '@/components/ui/StatusBar';
import EventPopup    from '@/components/ui/EventPopup';
import LoadingScreen from '@/components/ui/LoadingScreen';
import TabPanel      from '@/components/ui/TabPanel';

const NAV_TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'globe',     label: 'Globe',     icon: '🌐' },
  { id: 'events',    label: 'Events',    icon: '📡' },
  { id: 'analytics', label: 'Stats',     icon: '📊' },
  { id: 'network',   label: 'Network',   icon: '🔗' },
];


const GlobeScene = dynamic(() => import('@/components/scene/GlobeScene'), {
  ssr: false, loading: () => null,
});

export default function HomePage() {
  const hasInteracted = useGlobeStore((s) => s.hasInteracted);
  const [hintHidden, setHintHidden] = useState(false);
  const [events, setEvents]         = useState<GlobeEvent[]>(STATIC_FALLBACK);
  const [activeTab, setActiveTab]   = useState<NavTab>('globe');

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) { const d: GlobeEvent[] = await res.json(); if (d.length > 0) setEvents(d); }
    } catch { /* static fallback */ }
  };

  useEffect(() => {
    fetchEvents();
    const iv = setInterval(fetchEvents, 30_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHintHidden(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { if (hasInteracted) setHintHidden(true); }, [hasInteracted]);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(prev => prev === tab ? 'globe' : tab);
  };

  return (
    <>
      <LoadingScreen />

      {/* 3D canvas — always full screen, clips bottom on mobile */}
      <div className="globe-canvas-wrap" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <GlobeScene events={events} />
      </div>

      {/* Scanlines */}
      <div className="scanlines" aria-hidden="true" />

      {/* Corner brackets */}
      <div className="corner tl" aria-hidden="true" />
      <div className="corner tr" aria-hidden="true" />
      <div className="corner bl" aria-hidden="true" />
      <div className="corner br" aria-hidden="true" />

      {/* Header with nav tabs + admin add button */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        events={events}
        onEventAdded={fetchEvents}
      />

      {/* Right slide-in panel (Events / Analytics / Network tabs) */}
      {activeTab !== 'globe' && (
        <TabPanel
          tab={activeTab}
          events={events}
          onClose={() => setActiveTab('globe')}
        />
      )}

      {/* Status bar */}
      <StatusBar events={events} />

      {/* Centered event card — shown only on marker click or Events tab click */}
      <EventPopup />

      {/* Interaction hint */}
      <div
        className={`hint${hintHidden ? ' hint-hidden' : ''}`}
        aria-label="Interaction hint"
      >
        ↔ Drag · Pinch zoom · Tap markers
      </div>

      {/* Mobile bottom navigation bar (hidden on desktop via CSS) */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`mobile-nav-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => handleTabChange(id as NavTab)}
            aria-label={label}
          >
            <span className="mobile-nav-icon">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
