'use client';

// src/app/page.tsx
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useGlobeStore, applyGlobeFilter } from '@/store/globeStore';
import type { GlobeEvent } from '@/types/globe';
import { GLOBE_EVENTS as STATIC_FALLBACK } from '@/data/events';

import Header, { type NavTab } from '@/components/ui/Header';
import StatusBar        from '@/components/ui/StatusBar';
import EventPopup       from '@/components/ui/EventPopup';
import LoadingScreen    from '@/components/ui/LoadingScreen';
import TabPanel         from '@/components/ui/TabPanel';

const NAV_TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'globe',     label: 'Globe',   icon: '🌐' },
  { id: 'events',    label: 'Events',  icon: '📡' },
  { id: 'analytics', label: 'Stats',   icon: '📊' },
  { id: 'network',   label: 'Network', icon: '🔗' },
];

const GlobeScene = dynamic(() => import('@/components/scene/GlobeScene'), {
  ssr: false, loading: () => null,
});

export default function HomePage() {
  const hasInteracted  = useGlobeStore((s) => s.hasInteracted);
  const filterRegion   = useGlobeStore((s) => s.filterRegion);
  const filterCategory = useGlobeStore((s) => s.filterCategory);

  const [hintHidden, setHintHidden] = useState(false);

  // Admin-added events (from DB)
  const [events, setEvents]           = useState<GlobeEvent[]>(STATIC_FALLBACK);
  // Real-world events (NASA + USGS + Ticketmaster)
  const [worldEvents, setWorldEvents] = useState<GlobeEvent[]>([]);
  const [worldLoading, setWorldLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<NavTab>('globe');

  /* ── Fetch admin events ─────────────────────────────── */
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const d: GlobeEvent[] = await res.json();
        if (d.length > 0) setEvents(d.map(e => ({ ...e, source: 'admin' as const })));
      }
    } catch { /* static fallback */ }
  };

  /* ── Fetch world events ─────────────────────────────── */
  const fetchWorldEvents = async () => {
    setWorldLoading(true);
    try {
      const res = await fetch('/api/world-events');
      if (res.ok) {
        const d: GlobeEvent[] = await res.json();
        setWorldEvents(d);
      }
    } catch { /* silent — globe still works */ }
    finally { setWorldLoading(false); }
  };

  useEffect(() => {
    fetchEvents();
    const iv = setInterval(fetchEvents, 30_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorldEvents();
    const iv = setInterval(fetchWorldEvents, 10 * 60_000);
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

  // ── Apply filter to determine what shows on the globe ──
  const allEvents = useMemo(
    () => [...events, ...worldEvents],
    [events, worldEvents],
  );

  const filteredGlobeEvents = useMemo(
    () => applyGlobeFilter(allEvents, filterRegion, filterCategory),
    [allEvents, filterRegion, filterCategory],
  );

  // Filtered world events for the panel (same filter, world only)
  const filteredWorldEvents = useMemo(
    () => applyGlobeFilter(worldEvents, filterRegion, filterCategory),
    [worldEvents, filterRegion, filterCategory],
  );

  return (
    <>
      <LoadingScreen />

      {/* 3D canvas — only shows FILTERED events */}
      <div className="globe-canvas-wrap" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <GlobeScene events={filteredGlobeEvents} />
      </div>

      {/* Scanlines */}
      <div className="scanlines" aria-hidden="true" />

      {/* Corner brackets */}
      <div className="corner tl" aria-hidden="true" />
      <div className="corner tr" aria-hidden="true" />
      <div className="corner bl" aria-hidden="true" />
      <div className="corner br" aria-hidden="true" />

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        events={events}
        onEventAdded={fetchEvents}
      />

      {/* Right slide-in panel */}
      {activeTab !== 'globe' && (
        <TabPanel
          tab={activeTab}
          events={events}
          worldEvents={filteredWorldEvents}
          worldLoading={worldLoading}
          onWorldRefresh={fetchWorldEvents}
          onClose={() => setActiveTab('globe')}
        />
      )}

      {/* Status bar */}
      <StatusBar events={events} worldEvents={worldEvents} />

      {/* Centered event popup */}
      <EventPopup />

      {/* Interaction hint */}
      <div
        className={`hint${hintHidden ? ' hint-hidden' : ''}`}
        aria-label="Interaction hint"
      >
        ↔ Drag · Pinch zoom · Tap markers
      </div>

      {/* Mobile bottom nav */}
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
