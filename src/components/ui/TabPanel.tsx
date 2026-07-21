'use client';
// src/components/ui/TabPanel.tsx
// Sliding right-side panel for Events / Analytics / Network tabs

import { useState } from 'react';
import { useGlobeStore, type RegionFilter, type CategoryFilter } from '@/store/globeStore';
import type { GlobeEvent } from '@/types/globe';
import type { NavTab } from './Header';

interface TabPanelProps {
  tab: NavTab;
  events: GlobeEvent[];
  worldEvents?: GlobeEvent[];
  worldLoading?: boolean;
  onWorldRefresh?: () => void;
  onClose: () => void;
}

/* ── helpers ── */
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

/* ── Category icons for world events ─────────────────── */
const CAT_ICON: Record<string, string> = {
  'Wildfire':     '🔥',
  'Volcano':      '🌋',
  'Severe Storm': '🌀',
  'Flood':        '🌊',
  'Landslide':    '⛰️',
  'Ice Event':    '🧊',
  'Drought':      '☀️',
  'Dust & Haze':  '🌫️',
  'Man-made':     '⚠️',
  'Extreme Heat': '🌡️',
  'Water Event':  '💧',
  'Snow & Ice':   '❄️',
  'Earthquake':   '🫨',
};

function getCatIcon(cat: string) {
  return CAT_ICON[cat] ?? '📍';
}

export default function TabPanel({
  tab, events, worldEvents = [], worldLoading = false, onWorldRefresh, onClose,
}: TabPanelProps) {
  return (
    <aside className="tab-panel-mobile" style={{
      position: 'fixed', top: 72, right: 0, bottom: 36,
      width: 340, zIndex: 80,
      background: 'linear-gradient(180deg, rgba(6,6,20,0.97) 0%, rgba(8,4,22,0.96) 100%)',
      backdropFilter: 'blur(24px)',
      borderLeft: '1px solid rgba(0,255,255,0.13)',
      borderTop: '1px solid rgba(0,255,255,0.10)',
      borderRadius: '14px 0 0 14px',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-12px 0 60px rgba(0,0,0,0.5)',
      animation: 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .tp-scroll::-webkit-scrollbar { width: 4px; }
        .tp-scroll::-webkit-scrollbar-track { background: transparent; }
        .tp-scroll::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.15); border-radius: 99px; }
        .ev-card:hover { background: rgba(0,255,255,0.06) !important; border-color: rgba(0,255,255,0.25) !important; }
        .wev-card:hover { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.15) !important; }
        @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>

      {/* Panel header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,255,255,0.09)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#fff' }}>
            {({ events: '📡 LIVE EVENTS', analytics: '📊 ANALYTICS', network: '🔗 NETWORK' } as Record<string, string>)[tab]}
          </div>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.45)', letterSpacing: '0.14em', marginTop: 3 }}>
            {tab === 'events'    && `${events.length} STREAMS · ${worldEvents.length} WORLD`}
            {tab === 'analytics' && 'REAL-TIME BREAKDOWN'}
            {tab === 'network'   && 'NODE STATUS REPORT'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
          color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
          padding: '5px 10px', transition: 'all 0.18s' }}>✕</button>
      </div>

      {/* Content */}
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
        {tab === 'events'    && (
          <EventsTab
            events={events}
            worldEvents={worldEvents}
            worldLoading={worldLoading}
            onWorldRefresh={onWorldRefresh}
          />
        )}
        {tab === 'analytics' && <AnalyticsTab events={events} worldEvents={worldEvents} />}
        {tab === 'network'   && <NetworkTab   events={events} />}
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════
   EVENTS TAB  —  MY EVENTS  |  🌍 WORLD FEED
════════════════════════════════════════════════════════════ */
function EventsTab({
  events, worldEvents, worldLoading, onWorldRefresh,
}: {
  events: GlobeEvent[];
  worldEvents: GlobeEvent[];
  worldLoading: boolean;
  onWorldRefresh?: () => void;
}) {
  const filterRegion      = useGlobeStore(s => s.filterRegion);
  const filterCategory    = useGlobeStore(s => s.filterCategory);
  const setFilterRegion   = useGlobeStore(s => s.setFilterRegion);
  const setFilterCategory = useGlobeStore(s => s.setFilterCategory);
  const resetFilters      = useGlobeStore(s => s.resetFilters);

  const [feed, setFeed] = useState<'mine' | 'world'>('mine');
  const [catFilter, setCatFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'severity' | 'region'>('newest');

  // Unique categories in world events
  const allCats = ['All', ...Array.from(new Set(worldEvents.map(e => e.category))).sort()];

  const filteredWorld = catFilter === 'All'
    ? worldEvents
    : worldEvents.filter(e => e.category === catFilter);

  const isFiltered = filterRegion !== 'all' || filterCategory !== 'all';

  // Region chips config
  const REGIONS: { id: RegionFilter; label: string; flag: string }[] = [
    { id: 'all',      label: 'All',      flag: '🌐' },
    { id: 'india',    label: 'India',    flag: '🇮🇳' },
    { id: 'asia',     label: 'Asia',     flag: '🌏' },
    { id: 'europe',   label: 'Europe',   flag: '🌍' },
    { id: 'americas', label: 'Americas', flag: '🌎' },
    { id: 'africa',   label: 'Africa',   flag: '🌍' },
    { id: 'oceania',  label: 'Oceania',  flag: '🏝️' },
  ];

  // Category chips config
  const CATS: { id: CategoryFilter; label: string; icon: string; color: string }[] = [
    { id: 'all',        label: 'All',        icon: '📍', color: '#00FFFF' },
    { id: 'admin',      label: 'My Events',  icon: '⭐', color: '#00FFFF' },
    { id: 'natural',    label: 'Natural',    icon: '🌋', color: '#FF6B35' },
    { id: 'earthquake', label: 'Earthquake', icon: '🫨', color: '#A855F7' },
    { id: 'wildfire',   label: 'Wildfire',   icon: '🔥', color: '#FF4444' },
    { id: 'storm',      label: 'Storm',      icon: '🌀', color: '#5EB8FF' },
    { id: 'tech',       label: 'Tech',       icon: '💻', color: '#5EB8FF' },
    { id: 'business',   label: 'Business',   icon: '💼', color: '#FFD700' },
    { id: 'music',      label: 'Music',      icon: '🎵', color: '#FF6B9D' },
    { id: 'sports',     label: 'Sports',     icon: '🏆', color: '#4ade80' },
  ];

  return (
    <div>

      {/* ═══════════════════════════════════════════════════════
          GLOBE FILTER — what shows on the 3D globe
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        background: 'rgba(0,255,255,0.04)',
        border: '1px solid rgba(0,255,255,0.10)',
        borderRadius: 12, padding: '12px 12px 10px',
        marginBottom: 16,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.55)', letterSpacing: '0.14em', fontWeight: 700 }}>
            🌐 GLOBE FILTER
          </div>
          {isFiltered && (
            <button onClick={resetFilters} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '2px 9px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)', fontSize: 9,
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.08em',
              transition: 'all 0.15s',
            }}>CLEAR ✕</button>
          )}
        </div>

        {/* Region row */}
        <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
          color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 6 }}>REGION</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {REGIONS.map(r => {
            const active = filterRegion === r.id;
            return (
              <button key={r.id} onClick={() => setFilterRegion(r.id)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 9px',
                background: active ? 'rgba(0,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(0,255,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, cursor: 'pointer',
                color: active ? '#00FFFF' : 'rgba(255,255,255,0.5)',
                fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: active ? 700 : 400,
                letterSpacing: '0.06em', transition: 'all 0.15s',
                boxShadow: active ? '0 0 10px rgba(0,255,255,0.15)' : 'none',
              }}>
                <span style={{ fontSize: 12 }}>{r.flag}</span> {r.label}
              </button>
            );
          })}
        </div>

        {/* Category row */}
        <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
          color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 6 }}>CATEGORY</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATS.map(c => {
            const active = filterCategory === c.id;
            return (
              <button key={c.id} onClick={() => setFilterCategory(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 9px',
                background: active ? `${c.color}20` : 'rgba(255,255,255,0.04)',
                border: active ? `1px solid ${c.color}80` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, cursor: 'pointer',
                color: active ? c.color : 'rgba(255,255,255,0.5)',
                fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: active ? 700 : 400,
                letterSpacing: '0.06em', transition: 'all 0.15s',
                boxShadow: active ? `0 0 10px ${c.color}22` : 'none',
              }}>
                <span style={{ fontSize: 12 }}>{c.icon}</span> {c.label}
              </button>
            );
          })}
        </div>

        {/* Active filter summary */}
        {isFiltered && (
          <div style={{ marginTop: 10, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
              color: '#4ade80', letterSpacing: '0.1em' }}>● FILTERING GLOBE</span>
            <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
              color: 'rgba(255,255,255,0.3)' }}>—</span>
            {filterRegion !== 'all' && (
              <span style={{ fontSize: 8, color: '#00FFFF',
                fontFamily: "'JetBrains Mono',monospace" }}>
                {REGIONS.find(r => r.id === filterRegion)?.flag} {filterRegion.toUpperCase()}
              </span>
            )}
            {filterCategory !== 'all' && (
              <span style={{ fontSize: 8, color: CATS.find(c => c.id === filterCategory)?.color,
                fontFamily: "'JetBrains Mono',monospace" }}>
                {CATS.find(c => c.id === filterCategory)?.icon} {filterCategory.toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Feed toggle ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([['mine', '📡 MY EVENTS'], ['world', '🌍 WORLD FEED']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFeed(key)} style={{
            flex: 1, padding: '8px 6px',
            background: feed === key ? 'rgba(0,255,255,0.10)' : 'rgba(255,255,255,0.03)',
            border: feed === key ? '1px solid rgba(0,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            color: feed === key ? '#00FFFF' : 'rgba(255,255,255,0.45)',
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
            letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: feed === key ? '0 0 12px rgba(0,255,255,0.08)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ── MY EVENTS ─────────────────────────────────── */}
      {feed === 'mine' && <MyEventsView events={events} />}

      {/* ── WORLD FEED ── */}
      {feed === 'world' && (
        <WorldFeedView
          events={filteredWorld}
          allCats={allCats}
          catFilter={catFilter}
          onCatFilter={setCatFilter}
          sortBy={sortBy}
          onSortBy={setSortBy}
          loading={worldLoading}
          onRefresh={onWorldRefresh}
          totalCount={worldEvents.length}
        />
      )}
    </div>
  );
}

/* ── My Events (admin-added) ─────────────────────────── */
function MyEventsView({ events }: { events: GlobeEvent[] }) {
  const setActiveEvent = useGlobeStore(s => s.setActiveEvent);

  return (
    <div>
      {events.map((ev) => (
        <button key={ev.id} className="ev-card" onClick={() =>
          setActiveEvent(ev, { x: window.innerWidth / 2, y: window.innerHeight / 2 })}
          style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(0,255,255,0.10)', borderRadius: 12, padding: '13px 14px',
            marginBottom: 10, cursor: 'pointer', transition: 'all 0.18s', display: 'block' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: ev.color,
              boxShadow: `0 0 8px ${ev.color}`, flexShrink: 0,
              animation: 'pulse-dot 1.8s ease-in-out infinite' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>
                📍 {ev.city}, {ev.country}
              </div>
            </div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
              color: '#ff4444', background: 'rgba(255,68,68,0.12)',
              border: '1px solid rgba(255,68,68,0.3)', borderRadius: 20,
              padding: '2px 8px', letterSpacing: '0.1em', flexShrink: 0 }}>
              ● LIVE
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              ['USERS',    `👥 ${ev.users}`],
              ['CATEGORY', ev.category],
              ['DURATION', ev.duration],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 7, padding: '6px 8px' }}>
                <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                  color: 'rgba(0,255,255,0.45)', letterSpacing: '0.12em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Coordinates */}
          <div style={{ marginTop: 8, fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.35)', letterSpacing: '0.08em' }}>
            {ev.lat >= 0 ? `${ev.lat.toFixed(2)}°N` : `${Math.abs(ev.lat).toFixed(2)}°S`}
            {' · '}
            {ev.lng >= 0 ? `${ev.lng.toFixed(2)}°E` : `${Math.abs(ev.lng).toFixed(2)}°W`}
          </div>
        </button>
      ))}

      {events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)',
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
          No live events<br/>
          <span style={{ fontSize: 9, color: 'rgba(0,255,255,0.3)', marginTop: 6, display: 'block' }}>
            Admin can add events via + button
          </span>
        </div>
      )}
    </div>
  );
}

/* ── World Feed (NASA + USGS) ────────────────────────── */
function WorldFeedView({
  events, allCats, catFilter, onCatFilter,
  sortBy, onSortBy,
  loading, onRefresh, totalCount,
}: {
  events: GlobeEvent[];
  allCats: string[];
  catFilter: string;
  onCatFilter: (c: string) => void;
  sortBy: 'newest' | 'severity' | 'region';
  onSortBy: (s: 'newest' | 'severity' | 'region') => void;
  loading: boolean;
  onRefresh?: () => void;
  totalCount: number;
}) {
  const setActiveEvent = useGlobeStore(s => s.setActiveEvent);

  // Apply sort
  const sorted = [...events].sort((a, b) => {
    if (sortBy === 'severity') {
      return (b.severity ?? 0) - (a.severity ?? 0);
    }
    if (sortBy === 'region') {
      return (a.country ?? '').localeCompare(b.country ?? '');
    }
    // newest: leave as-is (already sorted newest first from APIs)
    return 0;
  });

  return (
    <div>
      {/* ── Header bar ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
          {loading ? 'UPDATING…' : `${totalCount} ACTIVE EVENTS`}
        </div>
        <button onClick={onRefresh} disabled={loading} title="Refresh world events" style={{
          background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.2)',
          borderRadius: 7, padding: '4px 10px', cursor: loading ? 'not-allowed' : 'pointer',
          color: 'rgba(0,255,255,0.7)', fontSize: 11, transition: 'all 0.18s',
          opacity: loading ? 0.5 : 1,
        }}>
          <span style={{ display: 'inline-block', animation: loading ? 'spin-slow 1s linear infinite' : 'none' }}>↻</span>
        </button>
      </div>

      {/* ── Sort controls ────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
          color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
          alignSelf: 'center', flexShrink: 0 }}>SORT</span>
        {([
          ['newest',   '⏱ NEWEST'],
          ['severity', '⚠️ SEVERITY'],
          ['region',   '🌍 REGION'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => onSortBy(key)} style={{
            padding: '4px 9px',
            background: sortBy === key ? 'rgba(0,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: sortBy === key ? '1px solid rgba(0,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, cursor: 'pointer',
            color: sortBy === key ? '#00FFFF' : 'rgba(255,255,255,0.4)',
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '0.07em', transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Category filter chips ───────────────────────── */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {allCats.slice(0, 8).map(cat => (
          <button key={cat} onClick={() => onCatFilter(cat)} style={{
            padding: '4px 9px',
            background: catFilter === cat ? 'rgba(0,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: catFilter === cat ? '1px solid rgba(0,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, cursor: 'pointer',
            color: catFilter === cat ? '#00FFFF' : 'rgba(255,255,255,0.45)',
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '0.07em', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {cat === 'All' ? '🌐 All' : `${getCatIcon(cat)} ${cat}`}
          </button>
        ))}
      </div>

      {/* ── Loading skeleton ────────────────────────────── */}
      {loading && events.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }}/>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {!loading && events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0',
          color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
          No events match your filter<br/>
          <span style={{ fontSize: 9, marginTop: 6, display: 'block', color: 'rgba(0,255,255,0.3)' }}>
            Try a different category or use CLEAR on the globe
          </span>
        </div>
      )}

      {sorted.map((ev) => {
        const icon = getCatIcon(ev.category);
        const isQuake = ev.category === 'Earthquake';
        const mag = ev.severity;

        return (
          <button
            key={ev.id}
            className="wev-card"
            onClick={() => setActiveEvent(ev, { x: window.innerWidth / 2, y: window.innerHeight / 2 })}
            style={{
              width: '100%', textAlign: 'left',
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${ev.color}22`,
              borderLeft: `3px solid ${ev.color}`,
              borderRadius: 12, padding: '12px 12px 10px',
              marginBottom: 9, cursor: 'pointer', transition: 'all 0.18s', display: 'block',
            }}>

            {/* Top row: icon + title + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 7 }}>
              {/* Category icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: `${ev.color}18`, border: `1px solid ${ev.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>{icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Event title */}
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {ev.name}
                </div>
                {/* Location */}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                  📍 {ev.city}, {ev.country}
                </div>
              </div>

              {/* Time badge */}
              <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: 2,
                letterSpacing: '0.06em' }}>
                {ev.duration}
              </div>
            </div>

            {/* Bottom row: category chip + magnitude + coords */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Category badge */}
              <span style={{
                fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                color: ev.color, background: `${ev.color}18`,
                border: `1px solid ${ev.color}33`,
                borderRadius: 20, padding: '2px 8px', letterSpacing: '0.1em', fontWeight: 700,
              }}>
                {ev.type}
              </span>

              {/* Magnitude badge for earthquakes */}
              {isQuake && mag && (
                <span style={{
                  fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: 700,
                  color: ev.color,
                }}>
                  MAG {mag.toFixed(1)}
                </span>
              )}

              {/* Coordinates */}
              <span style={{ marginLeft: 'auto', fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                color: 'rgba(255,255,255,0.22)', letterSpacing: '0.05em' }}>
                {ev.lat >= 0 ? `${ev.lat.toFixed(1)}°N` : `${Math.abs(ev.lat).toFixed(1)}°S`}
                {' '}
                {ev.lng >= 0 ? `${ev.lng.toFixed(1)}°E` : `${Math.abs(ev.lng).toFixed(1)}°W`}
              </span>
            </div>
          </button>
        );
      })}

      {/* Source attribution */}
      {events.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)', borderRadius: 9,
          border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 5 }}>
            DATA SOURCES
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            🔴 NASA EONET — Natural Events<br/>
            🟣 USGS — Earthquake Feed (M4.5+)
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ANALYTICS TAB
════════════════════════════════════════════════════════════ */
function AnalyticsTab({ events, worldEvents }: { events: GlobeEvent[]; worldEvents: GlobeEvent[] }) {
  const totalUsers = events.reduce((s, e) => s + parseUsers(e.users), 0);

  // World event category breakdown
  const catMap: Record<string, number> = {};
  worldEvents.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + 1; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;

  // Hemisphere split (world events)
  const north = worldEvents.filter(e => e.lat >= 0).length;
  const south = worldEvents.length - north;
  const east  = worldEvents.filter(e => e.lng >= 0).length;
  const west  = worldEvents.length - east;

  const COLORS = ['#FF4444', '#FF6B35', '#5EB8FF', '#4ade80', '#FFB648', '#A855F7', '#FFD700'];

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          ['MY EVENTS',    String(events.length),      '#00FFFF'],
          ['WORLD EVENTS', String(worldEvents.length),  '#A855F7'],
          ['EARTHQUAKES',  String(worldEvents.filter(e => e.category === 'Earthquake').length), '#FF4444'],
          ['ACTIVE USERS', fmt(totalUsers),              '#4ade80'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
            padding: '12px 14px' }}>
            <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-0.01em' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* World events by category */}
      {cats.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.5)', letterSpacing: '0.15em', marginBottom: 12 }}>
            WORLD EVENTS BY TYPE
          </div>
          {cats.map(([cat, count], i) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                  {getCatIcon(cat)} {cat}
                </span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                  color: COLORS[i % COLORS.length] }}>{count}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxCat) * 100}%`,
                  background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i+1) % COLORS.length]})`,
                  borderRadius: 99, transition: 'width 0.6s ease',
                  boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}66` }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Geo distribution (world events) */}
      <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.10)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
          color: 'rgba(0,255,255,0.5)', letterSpacing: '0.15em', marginBottom: 12 }}>
          WORLD EVENT SPREAD
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['🌍 N. Hemisphere', north, worldEvents.length, '#4ade80'],
            ['🌏 S. Hemisphere', south, worldEvents.length, '#FFB648'],
            ['🌐 Eastern',       east,  worldEvents.length, '#00FFFF'],
            ['🌎 Western',       west,  worldEvents.length, '#A855F7'],
          ].map(([label, count, total, color]) => (
            <div key={String(label)}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: color as string }}>{count as number}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99,
                overflow: 'hidden', marginTop: 5 }}>
                <div style={{ height: '100%',
                  width: `${(total as number) ? ((count as number) / (total as number)) * 100 : 0}%`,
                  background: color as string, borderRadius: 99 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin event user table */}
      {events.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.5)', letterSpacing: '0.15em', marginBottom: 10 }}>
            ACTIVE USERS PER EVENT
          </div>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: ev.color,
                boxShadow: `0 0 6px ${ev.color}`, flexShrink: 0 }}/>
              <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.city}</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                color: ev.color, fontWeight: 700, flexShrink: 0 }}>{ev.users}</div>
              <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)',
                borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ height: '100%', borderRadius: 99,
                  width: `${totalUsers ? (parseUsers(ev.users) / totalUsers) * 100 : 0}%`,
                  background: ev.color }}/>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   NETWORK TAB
════════════════════════════════════════════════════════════ */
function NetworkTab({ events }: { events: GlobeEvent[] }) {
  const totalUsers = events.reduce((s, e) => s + parseUsers(e.users), 0);
  const connections = events.length * (events.length - 1) / 2;

  const signalPct = Math.min(100, events.length * 20);
  const signalLabel = signalPct >= 80 ? 'EXCELLENT' : signalPct >= 60 ? 'STRONG' : signalPct >= 40 ? 'GOOD' : 'WEAK';
  const signalColor = signalPct >= 80 ? '#4ade80' : signalPct >= 60 ? '#00FFFF' : signalPct >= 40 ? '#FFB648' : '#f87171';

  return (
    <div>
      {/* Network KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {[
          ['NODES',       String(events.length),   '#00FFFF'],
          ['CONNECTIONS', String(connections),       '#A855F7'],
          ['ONLINE',      fmt(totalUsers),           '#4ade80'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
            padding: '11px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace",
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Signal quality */}
      <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.10)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(0,255,255,0.5)', letterSpacing: '0.15em' }}>SIGNAL STRENGTH</div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            color: signalColor, fontWeight: 700 }}>{signalLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 32 }}>
          {[20, 40, 60, 80, 100].map(bar => (
            <div key={bar} style={{ flex: 1, height: `${bar}%`, borderRadius: '3px 3px 0 0',
              background: signalPct >= bar ? signalColor : 'rgba(255,255,255,0.08)',
              boxShadow: signalPct >= bar ? `0 0 8px ${signalColor}66` : 'none',
              transition: 'all 0.4s' }}/>
          ))}
        </div>
      </div>

      {/* Node list */}
      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
        color: 'rgba(0,255,255,0.5)', letterSpacing: '0.15em', marginBottom: 10 }}>
        ACTIVE NODES
      </div>
      {events.map((ev, i) => (
        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 9, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle, ${ev.color}22, transparent)`,
            border: `1px solid ${ev.color}44`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            color: ev.color, fontWeight: 700 }}>
            N{i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.city}</div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
              color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {ev.lat.toFixed(2)}, {ev.lng.toFixed(2)} · {ev.users} online
            </div>
          </div>
          <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
            color: '#4ade80', letterSpacing: '0.1em', flexShrink: 0 }}>● ONLINE</div>
        </div>
      ))}

      {events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0',
          color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
          No nodes online
        </div>
      )}
    </div>
  );
}
