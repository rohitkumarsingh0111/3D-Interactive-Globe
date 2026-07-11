'use client';

// src/components/scene/Atmosphere.tsx
// Realistic-looking atmosphere for the physical globe:
//   - Outer blue-white Fresnel rim (like seeing Earth from space)
//   - Inner thin haze layer
//   - Optional subtle purple/cyan accent for the "spatial cyber" branding

import { useMemo } from 'react';
import * as THREE from 'three';

const atmVertex = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const outerAtmFrag = /* glsl */`
  varying vec3 vNormal;
  uniform vec3 glowColor;
  uniform float intensity;
  void main() {
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float power = pow(rim, 2.8);
    gl_FragColor = vec4(glowColor, power * intensity);
  }
`;

const innerAtmFrag = /* glsl */`
  varying vec3 vNormal;
  uniform vec3 glowColor;
  uniform float intensity;
  void main() {
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float power = pow(rim, 5.0);
    gl_FragColor = vec4(glowColor, power * intensity);
  }
`;

interface AtmosphereProps {
  radius?: number;
}

export default function Atmosphere({ radius = 1 }: AtmosphereProps) {
  // Outer atmosphere — wide, light blue-white
  const outerUniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(0x5599ff) },
    intensity: { value: 0.90 },
  }), []);

  // Inner thin haze — slightly warmer blue
  const innerUniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(0x3377ee) },
    intensity: { value: 0.60 },
  }), []);

  // Very faint cyan brand accent on the far edge
  const accentUniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(0x00ccff) },
    intensity: { value: 0.30 },
  }), []);

  return (
    <group>
      {/* Outer wide atmosphere */}
      <mesh>
        <sphereGeometry args={[radius * 1.22, 64, 64]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={atmVertex}
          fragmentShader={outerAtmFrag}
          uniforms={outerUniforms}
        />
      </mesh>

      {/* Inner haze ring */}
      <mesh>
        <sphereGeometry args={[radius * 1.05, 64, 64]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={atmVertex}
          fragmentShader={innerAtmFrag}
          uniforms={innerUniforms}
        />
      </mesh>

      {/* Cyan brand accent edge */}
      <mesh>
        <sphereGeometry args={[radius * 1.28, 64, 64]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={atmVertex}
          fragmentShader={outerAtmFrag}
          uniforms={accentUniforms}
        />
      </mesh>
    </group>
  );
}
