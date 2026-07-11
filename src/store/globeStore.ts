// src/store/globeStore.ts
import { create } from 'zustand';
import { GlobeEvent } from '@/types/globe';

interface GlobeStore {
  activeEvent: GlobeEvent | null;
  popupScreen: { x: number; y: number };
  hasInteracted: boolean;
  setActiveEvent: (event: GlobeEvent | null, screen?: { x: number; y: number }) => void;
  updatePopupScreen: (x: number, y: number) => void;
  setHasInteracted: () => void;
}

export const useGlobeStore = create<GlobeStore>((set) => ({
  activeEvent: null,
  popupScreen: { x: 0, y: 0 },
  hasInteracted: false,
  setActiveEvent: (event, screen) =>
    set({ activeEvent: event, popupScreen: screen ?? { x: 0, y: 0 } }),
  updatePopupScreen: (x, y) => set({ popupScreen: { x, y } }),
  setHasInteracted: () => set({ hasInteracted: true }),
}));
