'use client';

// src/components/scene/GlobeScene.tsx

import { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import StarField   from './StarField';
import EventMarker from './EventMarker';

import { GLOBE_EVENTS } from '@/data/events';
import { useGlobeStore } from '@/store/globeStore';
import { latLngToXYZ } from '@/lib/geoUtils';
import type { GlobeEvent } from '@/types/globe';


/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const EARTH_DAY      = '/textures/earth_day.jpg';
const EARTH_NORMAL   = '/textures/earth_normal.jpg';
const EARTH_SPECULAR = '/textures/earth_specular.jpg';
const EARTH_CLOUDS   = '/textures/earth_clouds.png';

const MIN_DIST     = 1.55;   // closest zoom (almost touching surface)
const MAX_DIST     = 7.0;    // farthest zoom
const ROTATE_SENS  = 0.0038; // drag sensitivity (rad/px)
const ZOOM_IN      = 0.87;   // scroll-in factor
const ZOOM_OUT     = 1.15;   // scroll-out factor
const DAMP         = 12;     // exponential damping coefficient

/* ═══════════════════════════════════════════════════════════════
   CUSTOM CAMERA CONTROLLER
   - Replaces OrbitControls entirely
   - Zooms toward the exact globe surface point under cursor/pinch
   - Drag rotates camera around globe centre
   - Full touch / pinch support
   - Framerate-independent exponential damping
═══════════════════════════════════════════════════════════════ */
function CameraController() {
  const { camera, gl } = useThree();
  const setHasInteracted = useGlobeStore((s) => s.setHasInteracted);

  // Spherical coords – current (rendered) and target (where we're animating to)
  const curS = useRef(new THREE.Spherical());
  const tgtS = useRef(new THREE.Spherical());
  const ready = useRef(false);

  // Drag state
  const dragging      = useRef(false);
  const dragOrigin    = useRef({ x: 0, y: 0 });
  const tgtAtDragStart = useRef(new THREE.Spherical());

  // Touch state
  const prevTouches   = useRef<{ x: number; y: number }[]>([]);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Raycaster + unit sphere for intersection tests
  const raycaster   = useMemo(() => new THREE.Raycaster(), []);
  const unitSphere  = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 1.0), []);

  // ── Seed spherical from camera's initial position ──────────
  useEffect(() => {
    curS.current.setFromVector3(camera.position);
    tgtS.current.copy(curS.current);
    ready.current = true;
  }, [camera]);

  // ── Per-frame: lerp → target, push to camera ───────────────
  useFrame((_, delta) => {
    if (!ready.current) return;

    const a = 1 - Math.exp(-DAMP * delta); // framerate-independent alpha

    curS.current.radius += (tgtS.current.radius - curS.current.radius) * a;
    curS.current.theta  += (tgtS.current.theta  - curS.current.theta)  * a;
    curS.current.phi    += (tgtS.current.phi    - curS.current.phi)    * a;

    curS.current.radius = THREE.MathUtils.clamp(curS.current.radius, MIN_DIST, MAX_DIST);
    curS.current.phi    = THREE.MathUtils.clamp(curS.current.phi, 0.05, Math.PI - 0.05);

    camera.position.setFromSpherical(curS.current);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  });

  // ── Event listeners ────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;

    /* Helper – raycast cursor/touch position to globe surface.
       Returns the 3-D hit point, or null if the ray misses. */
    const hitGlobe = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = canvas.getBoundingClientRect();
      const ndc  = new THREE.Vector2(
        ((clientX - rect.left) / rect.width)  * 2 - 1,
        -((clientY - rect.top)  / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      return raycaster.ray.intersectSphere(unitSphere, pt) ? pt.clone() : null;
    };

    /* Helper – apply zoom.
       zoomFactor > 1 → zoom out (camera moves away)
       zoomFactor < 1 → zoom in  (camera moves toward hitPt) */
    const applyZoom = (zoomFactor: number, clientX: number, clientY: number) => {
      const hit = hitGlobe(clientX, clientY);

      let newPos: THREE.Vector3;

      if (hit) {
        /*
         * Key maths for "zoom to cursor on a sphere":
         *
         *   newPos = camPos + (hit - camPos) * (1 - zoomFactor)
         *
         * When zoomFactor < 1 (zoom in):
         *   1 - zoomFactor > 0  →  camera moves TOWARD hit point
         *
         * When zoomFactor > 1 (zoom out):
         *   1 - zoomFactor < 0  →  camera moves AWAY from hit point
         *
         * Because hit is on the unit sphere, moving toward it
         * simultaneously reduces distance AND shifts the view angle
         * so the clicked region fills more of the screen – exactly
         * like Google Earth zoom behaviour.
         */
        const dir    = hit.clone().sub(camera.position);
        const travel = dir.length() * (1 - zoomFactor);
        newPos = camera.position.clone().addScaledVector(dir.normalize(), travel);
      } else {
        // Cursor outside globe – fallback: scale radius
        newPos = camera.position.clone().multiplyScalar(zoomFactor);
      }

      // Clamp so we never clip inside the sphere or go too far
      const dist = newPos.length();
      if (dist < MIN_DIST) newPos.normalize().multiplyScalar(MIN_DIST);
      if (dist > MAX_DIST) newPos.normalize().multiplyScalar(MAX_DIST);

      tgtS.current.setFromVector3(newPos);
    };

    // ── SCROLL WHEEL ─────────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(e.deltaY > 0 ? ZOOM_OUT : ZOOM_IN, e.clientX, e.clientY);
      setHasInteracted();
    };

    // ── MOUSE DRAG ───────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      tgtAtDragStart.current.copy(tgtS.current);
      canvas.style.cursor = 'grabbing';
      setHasInteracted();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      tgtS.current.theta = tgtAtDragStart.current.theta - dx * ROTATE_SENS;
      tgtS.current.phi   = THREE.MathUtils.clamp(
        tgtAtDragStart.current.phi + dy * ROTATE_SENS,
        0.06, Math.PI - 0.06,
      );
    };

    const onMouseUp = () => {
      dragging.current = false;
      canvas.style.cursor = 'grab';
    };

    // ── TOUCH ────────────────────────────────────────────────
    const TAP_THRESHOLD = 8; // px — below this = tap, above = drag

    const onTouchStart = (e: TouchEvent) => {
      // Don't preventDefault here — allow R3F onClick to fire on taps
      prevTouches.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      if (e.touches.length === 1) {
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        dragging.current = false; // will be set true only if movement exceeds threshold
        dragOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tgtAtDragStart.current.copy(tgtS.current);
      }
      setHasInteracted();
    };

    const onTouchMove = (e: TouchEvent) => {
      const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));

      if (e.touches.length === 1) {
        const dx = cur[0].x - touchStartPos.current.x;
        const dy = cur[0].y - touchStartPos.current.y;
        const moved = Math.hypot(dx, dy);

        if (!dragging.current && moved > TAP_THRESHOLD) {
          // Crossed the drag threshold — now it's a drag, not a tap
          dragging.current = true;
        }

        if (dragging.current) {
          e.preventDefault(); // prevent page scroll only when actually dragging
          const ddx = cur[0].x - dragOrigin.current.x;
          const ddy = cur[0].y - dragOrigin.current.y;
          tgtS.current.theta = tgtAtDragStart.current.theta - ddx * ROTATE_SENS;
          tgtS.current.phi   = THREE.MathUtils.clamp(
            tgtAtDragStart.current.phi + ddy * ROTATE_SENS,
            0.06, Math.PI - 0.06,
          );
        }
      } else if (e.touches.length >= 2 && prevTouches.current.length >= 2) {
        e.preventDefault();
        // Two-finger pinch → zoom toward midpoint between fingers
        const prev = prevTouches.current;
        const prevDist = Math.hypot(prev[1].x - prev[0].x, prev[1].y - prev[0].y);
        const curDist  = Math.hypot(cur[1].x  - cur[0].x,  cur[1].y  - cur[0].y);

        if (prevDist > 1) {
          const pinchScale = prevDist / curDist;
          const midX = (cur[0].x + cur[1].x) / 2;
          const midY = (cur[0].y + cur[1].y) / 2;
          applyZoom(pinchScale, midX, midY);
        }
      }

      prevTouches.current = cur;
    };

    const onTouchEnd = (e: TouchEvent) => {
      dragging.current = false;
      prevTouches.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    };

    canvas.style.cursor = 'grab';

    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    return () => {
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.style.cursor = '';
    };
  }, [camera, gl, raycaster, unitSphere, setHasInteracted, touchStartPos]);

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   PHYSICAL EARTH  (surface + clouds in one rotating group)
═══════════════════════════════════════════════════════════════ */
function EarthGlobe({ radius = 1, events = GLOBE_EVENTS }: { radius?: number; events?: GlobeEvent[] }) {
  const groupRef  = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, specularMap, cloudsMap] = useTexture([
    EARTH_DAY, EARTH_NORMAL, EARTH_SPECULAR, EARTH_CLOUDS,
  ]);

  useMemo(() => {
    dayMap.colorSpace      = THREE.SRGBColorSpace; dayMap.anisotropy      = 16;
    normalMap.colorSpace   = THREE.NoColorSpace;   normalMap.anisotropy   = 8;
    specularMap.colorSpace = THREE.NoColorSpace;   specularMap.anisotropy = 8;
    cloudsMap.colorSpace   = THREE.SRGBColorSpace; cloudsMap.anisotropy   = 4;
  }, [dayMap, normalMap, specularMap, cloudsMap]);

  useFrame((_, delta) => {
    // Globe spins on its own axis (Earth-like rotation)
    if (groupRef.current)  groupRef.current.rotation.y  += delta * 0.06;
    // Clouds drift a little faster than the surface
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.008;
  });

  return (
    <group ref={groupRef} name="globe-group">
      {/* Earth surface */}
      <mesh>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          specularMap={specularMap}
          specular={new THREE.Color(0x1a4477)}
          shininess={28}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.005, 128, 128]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </mesh>

      {/* Event markers rotate with the globe */}
      {events.map((ev, i) => (
        <EventMarker
          key={ev.id}
          event={ev}
          globeRadius={radius * 1.012}
          phaseOffset={i * (Math.PI / 2)}
        />
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LIGHTING
═══════════════════════════════════════════════════════════════ */
function Lighting() {
  return (
    <>
      {/* Hemisphere: sky blue-white above, dark space below */}
      <hemisphereLight args={[0x8ab4e8, 0x0a0a1a, 0.55]} />
      {/* Main sun — warm from upper-right */}
      <directionalLight position={[4, 2, 3]} intensity={2.4} color={0xfffcf0} />
      {/* Faint fill from opposite side — softens terminator */}
      <directionalLight position={[-5, -1, -4]} intensity={0.18} color={0x2255bb} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POPUP TRACKER
   Converts the marker's local lat/lng position → world space
   (accounting for the rotating globe group) → 2-D screen coords
═══════════════════════════════════════════════════════════════ */
function PopupTracker() {
  const { camera, gl, scene } = useThree();
  const activeEvent  = useGlobeStore((s) => s.activeEvent);
  const updateScreen = useGlobeStore((s) => s.updatePopupScreen);

  useFrame(() => {
    if (!activeEvent) return;
    const group = scene.getObjectByName('globe-group') as THREE.Group | undefined;
    const local = latLngToXYZ(activeEvent.lat, activeEvent.lng, 1.012);
    const world = group
      ? local.clone().applyMatrix4(group.matrixWorld)
      : local.clone();
    const vec  = world.project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    updateScreen(
      ( vec.x * 0.5 + 0.5) * rect.width  + rect.left,
      (-vec.y * 0.5 + 0.5) * rect.height + rect.top,
    );
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   ROOT SCENE
═══════════════════════════════════════════════════════════════ */
export default function GlobeScene({ events = GLOBE_EVENTS }: { events?: GlobeEvent[] }) {
  const setActiveEvent = useGlobeStore((s) => s.setActiveEvent);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 1000, position: [0, 0, 3.0] }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ background: '#0A0A1A' }}
      onPointerMissed={() => setActiveEvent(null)}
    >
      <Suspense fallback={null}>
        <StarField count={5000} />
        <Lighting />
        <EarthGlobe radius={1} events={events} />
        <PopupTracker />
        {/* Custom controller — no OrbitControls */}
        <CameraController />
      </Suspense>
    </Canvas>
  );
}
