'use client';
// src/components/ui/GlobeFilterBar.tsx
// Floating filter bar over the globe — controls which events are shown on the globe.

import { useGlobeStore, type RegionFilter, type CategoryFilter } from '@/store/globeStore';

/* ── Config ──────────────────────────────────────────── */
const REGIONS: { id: RegionFilter; label: string; flag: string }[] = [
  { id: 'all',      label: 'All Regions', flag: '🌐' },
  { id: 'india',    label: 'India',       flag: '🇮🇳' },
  { id: 'asia',     label: 'Asia',        flag: '🌏' },
  { id: 'europe',   label: 'Europe',      flag: '🌍' },
  { id: 'americas', label: 'Americas',    flag: '🌎' },
  { id: 'africa',   label: 'Africa',      flag: '🌍' },
  { id: 'oceania',  label: 'Oceania',     flag: '🏝️' },
];

const CATEGORIES: { id: CategoryFilter; label: string; icon: string; color: string }[] = [
  { id: 'all',        label: 'All Types',    icon: '📍', color: '#00FFFF' },
  { id: 'admin',      label: 'My Events',    icon: '⭐', color: '#00FFFF' },
  { id: 'natural',    label: 'Natural',      icon: '🌋', color: '#FF6B35' },
  { id: 'earthquake', label: 'Earthquake',   icon: '🫨', color: '#A855F7' },
  { id: 'wildfire',   label: 'Wildfire',     icon: '🔥', color: '#FF4444' },
  { id: 'storm',      label: 'Storm',        icon: '🌀', color: '#5EB8FF' },
  { id: 'tech',       label: 'Tech',         icon: '💻', color: '#5EB8FF' },
  { id: 'business',   label: 'Business',     icon: '💼', color: '#FFD700' },
  { id: 'music',      label: 'Music',        icon: '🎵', color: '#FF6B9D' },
  { id: 'sports',     label: 'Sports',       icon: '🏆', color: '#4ade80' },
];

export default function GlobeFilterBar({ eventCount }: { eventCount: number }) {
  const filterRegion   = useGlobeStore(s => s.filterRegion);
  const filterCategory = useGlobeStore(s => s.filterCategory);
  const setFilterRegion   = useGlobeStore(s => s.setFilterRegion);
  const setFilterCategory = useGlobeStore(s => s.setFilterCategory);
  const resetFilters   = useGlobeStore(s => s.resetFilters);

  const isFiltered = filterRegion !== 'all' || filterCategory !== 'all';

  return (
    <>
      <style>{`
        .gfb-scroll::-webkit-scrollbar { display: none; }
        .gfb-scroll { scrollbar-width: none; }
        .gfb-chip:hover { opacity: 1 !important; }
        @keyframes gfb-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 68,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        animation: 'gfb-in 0.3s ease',
        pointerEvents: 'none', // children re-enable
      }}>

        {/* ── Row 1: Region filter ──────────────────────── */}
        <div
          className="gfb-scroll"
          style={{
            display: 'flex', gap: 5, overflowX: 'auto',
            pointerEvents: 'auto',
            padding: '0 4px',
          }}
        >
          {REGIONS.map(r => {
            const active = filterRegion === r.id;
            return (
              <button
                key={r.id}
                className="gfb-chip"
                onClick={() => setFilterRegion(active ? 'all' : r.id)}
                title={r.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px',
                  background: active
                    ? 'rgba(0,255,255,0.18)'
                    : 'rgba(6,6,20,0.82)',
                  backdropFilter: 'blur(12px)',
                  border: active
                    ? '1px solid rgba(0,255,255,0.55)'
                    : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 20,
                  color: active ? '#00FFFF' : 'rgba(255,255,255,0.55)',
                  fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s',
                  opacity: active ? 1 : 0.85,
                  boxShadow: active ? '0 0 14px rgba(0,255,255,0.18)' : 'none',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 13 }}>{r.flag}</span>
                <span>{r.id === 'all' ? 'ALL REGIONS' : r.label.toUpperCase()}</span>
                {active && r.id !== 'all' && (
                  <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>✕</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Row 2: Category filter ────────────────────── */}
        <div
          className="gfb-scroll"
          style={{
            display: 'flex', gap: 5, overflowX: 'auto',
            pointerEvents: 'auto',
            padding: '0 4px',
          }}
        >
          {CATEGORIES.map(c => {
            const active = filterCategory === c.id;
            return (
              <button
                key={c.id}
                className="gfb-chip"
                onClick={() => setFilterCategory(active ? 'all' : c.id)}
                title={c.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px',
                  background: active
                    ? `${c.color}22`
                    : 'rgba(6,6,20,0.82)',
                  backdropFilter: 'blur(12px)',
                  border: active
                    ? `1px solid ${c.color}99`
                    : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 20,
                  color: active ? c.color : 'rgba(255,255,255,0.55)',
                  fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s',
                  opacity: active ? 1 : 0.85,
                  boxShadow: active ? `0 0 14px ${c.color}28` : 'none',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 13 }}>{c.icon}</span>
                <span>{c.label.toUpperCase()}</span>
                {active && c.id !== 'all' && (
                  <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>✕</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Active filter summary bar ─────────────────── */}
        {isFiltered && (
          <div style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'rgba(6,6,20,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '4px 14px',
            alignSelf: 'center',
          }}>
            <span style={{
              fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
              color: '#4ade80', letterSpacing: '0.08em',
            }}>
              ● {eventCount} EVENTS SHOWN
            </span>
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.12)' }} />
            <button
              onClick={resetFilters}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)', fontSize: 10,
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: '0.08em', transition: 'color 0.15s',
                padding: 0,
              }}
            >
              CLEAR ✕
            </button>
          </div>
        )}
      </div>
    </>
  );
}
