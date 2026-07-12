'use client';

// src/components/ui/SidePanel.tsx
import { useGlobeStore } from '@/store/globeStore';
import type { GlobeEvent } from '@/types/globe';
import { GLOBE_EVENTS } from '@/data/events';

interface SidePanelProps {
  events?: GlobeEvent[];
}

export default function SidePanel({ events = GLOBE_EVENTS }: SidePanelProps) {
  const setActiveEvent = useGlobeStore((s) => s.setActiveEvent);
  const activeEvent    = useGlobeStore((s) => s.activeEvent);

  return (
    <aside className="side-panel" aria-label="Live events">
      {events.map((ev) => (
        <button
          key={ev.id}
          className={`side-item${activeEvent?.id === ev.id ? ' side-item-active' : ''}`}
          onClick={() => {
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
