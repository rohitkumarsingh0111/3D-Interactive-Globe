'use client';

// src/components/ui/SidePanel.tsx
import { useGlobeStore } from '@/store/globeStore';
import { GLOBE_EVENTS } from '@/data/events';
import { latLngToXYZ } from '@/lib/geoUtils';

export default function SidePanel() {
  const setActiveEvent = useGlobeStore((s) => s.setActiveEvent);
  const activeEvent    = useGlobeStore((s) => s.activeEvent);

  return (
    <aside className="side-panel" aria-label="Live events">
      {GLOBE_EVENTS.map((ev) => (
        <button
          key={ev.id}
          className={`side-item${activeEvent?.id === ev.id ? ' side-item-active' : ''}`}
          onClick={() => {
            // We can't project here (no camera), so we just open with last known center
            setActiveEvent(ev, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
          }}
          aria-label={`View event: ${ev.name} in ${ev.city}`}
        >
          <div
            className="side-dot"
            style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }}
          />
          <div className="side-info">
            <div className="side-city">{ev.city}</div>
            <div className="side-name">{ev.name}</div>
          </div>
          <div className="side-arrow">›</div>
        </button>
      ))}
    </aside>
  );
}
