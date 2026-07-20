'use client';

// src/components/scene/EventMarker.tsx
// Lives INSIDE the rotating globe group — position is in local group space.
// Click handler projects the world position (after group transform) to screen.

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GlobeEvent } from '@/types/globe';
import { latLngToXYZ } from '@/lib/geoUtils';
import { useGlobeStore } from '@/store/globeStore';

/* ── Canvas-based marker textures ─────────────────────────────── */

function makeMarkerTexture(colorHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx  = size / 2;

  // Outer radial glow
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0,    colorHex + 'FF');
  grad.addColorStop(0.14, colorHex + 'CC');
  grad.addColorStop(0.40, colorHex + '55');
  grad.addColorStop(1,    colorHex + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Bright white core dot
  ctx.beginPath();
  ctx.arc(cx, cx, 9, 0, Math.PI * 2);
  ctx.fillStyle   = '#FFFFFF';
  ctx.shadowBlur  = 20;
  ctx.shadowColor = colorHex;
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function makePingTexture(colorHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx  = size / 2;

  ctx.beginPath();
  ctx.arc(cx, cx, cx * 0.46, 0, Math.PI * 2);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth   = 4;
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

/* ── Component ─────────────────────────────────────────────────── */

interface EventMarkerProps {
  event: GlobeEvent;
  globeRadius?: number;
  phaseOffset?: number;
}

export default function EventMarker({
  event,
  globeRadius = 1,
  phaseOffset = 0,
}: EventMarkerProps) {
  const coreRef = useRef<THREE.Sprite>(null);
  const pingRef = useRef<THREE.Sprite>(null);

  const { camera, gl } = useThree();
  const setActiveEvent   = useGlobeStore((s) => s.setActiveEvent);
  const setHasInteracted = useGlobeStore((s) => s.setHasInteracted);

  // Local position on the sphere (inside the rotating group)
  const localPos = useMemo(
    () => latLngToXYZ(event.lat, event.lng, globeRadius),
    [event.lat, event.lng, globeRadius]
  );

  const markerTex = useMemo(() => makeMarkerTexture(event.color), [event.color]);
  const pingTex   = useMemo(() => makePingTexture(event.color),   [event.color]);

  // Pulse the ping ring — faster for major world events
  useFrame(({ clock }) => {
    if (!pingRef.current) return;
    const isWorld = event.source === 'world';
    const isMajor = isWorld && (event.severity ?? 0) >= 6.5;
    const speed   = isMajor ? 2.0 : isWorld ? 1.5 : 1.1;
    const t = ((clock.getElapsedTime() * speed) + phaseOffset) % 1;
    pingRef.current.scale.setScalar(0.14 + t * 0.30);
    pingRef.current.material.opacity = (1 - t) * (isMajor ? 1.0 : 0.9);
  });

  // On click — project the sprite's WORLD position (after group rotation) to screen
  const handleClick = useCallback(() => {
    if (!coreRef.current) return;

    // getWorldPosition gives the actual world-space position after group rotation
    const worldPos = new THREE.Vector3();
    coreRef.current.getWorldPosition(worldPos);

    const vec  = worldPos.clone().project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const sx   = ( vec.x * 0.5 + 0.5) * rect.width  + rect.left;
    const sy   = (-vec.y * 0.5 + 0.5) * rect.height + rect.top;

    setActiveEvent(event, { x: sx, y: sy });
    setHasInteracted();
  }, [camera, gl, event, setActiveEvent, setHasInteracted]);

  // Marker scale: world events smaller, major quakes bigger, admin events normal
  const isWorld  = event.source === 'world';
  const isMajor  = isWorld && (event.severity ?? 0) >= 6.5;
  const baseScale = isMajor ? 0.14 : isWorld ? 0.09 : 0.15;

  return (
    <group position={localPos}>
      {/* Glow core — clickable */}
      <sprite ref={coreRef} scale={[baseScale, baseScale, baseScale]} onClick={handleClick}>
        <spriteMaterial
          map={markerTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </sprite>

      {/* Expanding ping ring */}
      <sprite ref={pingRef} scale={[baseScale, baseScale, baseScale]}>
        <spriteMaterial
          map={pingTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </sprite>
    </group>
  );
}
