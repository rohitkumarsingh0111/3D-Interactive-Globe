'use client';

// src/app/page.tsx
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useGlobeStore } from '@/store/globeStore';

import Header       from '@/components/ui/Header';
import SidePanel    from '@/components/ui/SidePanel';
import StatusBar    from '@/components/ui/StatusBar';
import EventPopup   from '@/components/ui/EventPopup';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Dynamically import the 3D scene to avoid SSR issues (Three.js is browser-only)
const GlobeScene = dynamic(() => import('@/components/scene/GlobeScene'), {
  ssr: false,
  loading: () => null,
});

export default function HomePage() {
  const hasInteracted = useGlobeStore((s) => s.hasInteracted);
  const [hintHidden, setHintHidden] = useState(false);

  // Auto-hide hint after 5 seconds or on first interaction
  useEffect(() => {
    const timer = setTimeout(() => setHintHidden(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasInteracted) setHintHidden(true);
  }, [hasInteracted]);

  return (
    <>
      {/* Loading screen */}
      <LoadingScreen />

      {/* Full-screen 3D canvas */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <GlobeScene />
      </div>

      {/* Scanlines overlay */}
      <div className="scanlines" aria-hidden="true" />

      {/* Corner brackets */}
      <div className="corner tl" aria-hidden="true" />
      <div className="corner tr" aria-hidden="true" />
      <div className="corner bl" aria-hidden="true" />
      <div className="corner br" aria-hidden="true" />

      {/* UI overlay */}
      <Header />
      <SidePanel />
      <StatusBar />
      <EventPopup />

      {/* Interaction hint */}
      <div
        className={`hint${hintHidden ? ' hint-hidden' : ''}`}
        aria-label="Interaction hint"
      >
        ↔ Drag to rotate &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click markers
      </div>
    </>
  );
}
