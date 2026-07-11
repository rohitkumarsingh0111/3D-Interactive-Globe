'use client';

// src/components/scene/DottedGlobe.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */`
  attribute float size;
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  varying vec3 vPosition;
  uniform vec3 cyanColor;
  uniform vec3 purpleColor;
  uniform float time;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;

    // Colour: blend cyan/purple based on lat + animated wave
    float t    = (vPosition.y + 1.0) * 0.5;
    float wave = sin(vPosition.x * 4.0 + vPosition.z * 4.0 + time * 0.35) * 0.5 + 0.5;
    vec3 col   = mix(cyanColor, purpleColor, clamp(t * 0.55 + wave * 0.45, 0.0, 1.0));

    // Soft circular point
    float alpha = smoothstep(0.5, 0.05, d) * 0.80;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function DottedGlobe({ radius = 1, count = 9000 }: { radius?: number; count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1.0 + Math.random() * 1.4;
    }
    return { positions, sizes };
  }, [radius, count]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  const uniforms = useMemo(() => ({
    time:        { value: 0 },
    cyanColor:   { value: new THREE.Color(0x00ffff) },
    purpleColor: { value: new THREE.Color(0x8a2be2) },
  }), []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
