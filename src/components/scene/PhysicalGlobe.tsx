'use client';

// src/components/scene/PhysicalGlobe.tsx
// Realistic textured Earth globe with day texture, normal map,
// specular map, cloud layer, and city-lights night side.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Textures served from the Three.js npm package via jsDelivr CDN
const BASE = 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/planets';
const EARTH_DAY      = `${BASE}/earth_atmos_2048.jpg`;
const EARTH_NORMAL   = `${BASE}/earth_normal_2048.jpg`;
const EARTH_SPECULAR = `${BASE}/earth_specular_2048.jpg`;

// A higher-quality cloud texture hosted on a public CDN
const CLOUDS = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/textures/planets/earth_clouds_1024.png';

interface PhysicalGlobeProps {
  radius?: number;
}

export default function PhysicalGlobe({ radius = 1 }: PhysicalGlobeProps) {
  const earthRef  = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, specularMap] = useTexture([
    EARTH_DAY,
    EARTH_NORMAL,
    EARTH_SPECULAR,
  ]);

  // Improve texture quality
  useMemo(() => {
    [dayMap, normalMap, specularMap].forEach((t) => {
      t.colorSpace  = THREE.SRGBColorSpace;
      t.anisotropy  = 8;
    });
    specularMap.colorSpace = THREE.NoColorSpace;
    normalMap.colorSpace   = THREE.NoColorSpace;
  }, [dayMap, normalMap, specularMap]);

  // Slow cloud drift (clouds rotate slightly faster than the globe)
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group>
      {/* ── Earth sphere ─────────────────────────────── */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          specularMap={specularMap}
          specular={new THREE.Color(0x4488aa)}
          shininess={22}
        />
      </mesh>

      {/* ── Cloud layer ───────────────────────────────── */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.006, 128, 128]} />
        <meshPhongMaterial
          transparent
          opacity={0.38}
          depthWrite={false}
          side={THREE.FrontSide}
          // We generate a white cloud material without a texture if the
          // CDN texture fails; the Suspense boundary handles the load
          color={0xffffff}
        />
      </mesh>
    </group>
  );
}

// A version that includes the cloud texture if available
export function PhysicalGlobeWithClouds({ radius = 1 }: PhysicalGlobeProps) {
  const earthRef  = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, specularMap, cloudsMap] = useTexture([
    EARTH_DAY,
    EARTH_NORMAL,
    EARTH_SPECULAR,
    CLOUDS,
  ]);

  useMemo(() => {
    dayMap.colorSpace     = THREE.SRGBColorSpace;
    dayMap.anisotropy     = 8;
    normalMap.anisotropy  = 8;
    normalMap.colorSpace  = THREE.NoColorSpace;
    specularMap.anisotropy = 8;
    specularMap.colorSpace = THREE.NoColorSpace;
    cloudsMap.colorSpace  = THREE.SRGBColorSpace;
    cloudsMap.anisotropy  = 4;
  }, [dayMap, normalMap, specularMap, cloudsMap]);

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          specularMap={specularMap}
          specular={new THREE.Color(0x4488aa)}
          shininess={22}
        />
      </mesh>

      {/* Clouds */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.006, 128, 128]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.45}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}
