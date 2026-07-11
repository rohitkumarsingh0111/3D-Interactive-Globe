// src/types/globe.ts

export interface GlobeEvent {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  name: string;
  type: string;
  users: string;
  category: string;
  duration: string;
  color: string;       // CSS hex e.g. '#00FFFF'
  threeColor: number;  // Three.js hex e.g. 0x00FFFF
}

export interface PopupState {
  event: GlobeEvent | null;
  screenX: number;
  screenY: number;
}
