// src/lib/geoUtils.ts
import * as THREE from 'three';

/**
 * Converts geographic lat/lng coordinates to a 3D Cartesian point
 * on a sphere of the given radius.
 */
export function latLngToXYZ(
  lat: number,
  lng: number,
  radius = 1
): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}
