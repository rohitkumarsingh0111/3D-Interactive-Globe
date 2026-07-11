'use client';

// src/components/scene/GlobeGrid.tsx
import { useMemo } from 'react';
import * as THREE from 'three';

interface GridLineProps {
  points: THREE.Vector3[];
}

function GridLine({ points }: GridLineProps) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.10,
        depthWrite: false,
      }),
    []
  );

  const lineObj = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);

  return <primitive object={lineObj} />;
}

function makeLatPoints(lat: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = (90 - lat) * (Math.PI / 180);
  for (let lng = 0; lng <= 360; lng += 2) {
    const theta = lng * (Math.PI / 180);
    pts.push(
      new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
         radius * Math.cos(phi),
         radius * Math.sin(phi) * Math.sin(theta)
      )
    );
  }
  return pts;
}

function makeLngPoints(lng: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const theta = lng * (Math.PI / 180);
  for (let lat = -90; lat <= 90; lat += 2) {
    const phi = (90 - lat) * (Math.PI / 180);
    pts.push(
      new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
         radius * Math.cos(phi),
         radius * Math.sin(phi) * Math.sin(theta)
      )
    );
  }
  return pts;
}

export default function GlobeGrid({ radius = 1.002 }: { radius?: number }) {
  const latLines = useMemo(() => {
    const result: THREE.Vector3[][] = [];
    for (let lat = -75; lat <= 75; lat += 15) {
      result.push(makeLatPoints(lat, radius));
    }
    return result;
  }, [radius]);

  const lngLines = useMemo(() => {
    const result: THREE.Vector3[][] = [];
    for (let lng = 0; lng < 360; lng += 15) {
      result.push(makeLngPoints(lng, radius));
    }
    return result;
  }, [radius]);

  return (
    <group>
      {latLines.map((pts, i) => (
        <GridLine key={`lat-${i}`} points={pts} />
      ))}
      {lngLines.map((pts, i) => (
        <GridLine key={`lng-${i}`} points={pts} />
      ))}
    </group>
  );
}
