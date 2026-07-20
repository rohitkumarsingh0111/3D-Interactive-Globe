// src/store/globeStore.ts
import { create } from 'zustand';
import { GlobeEvent } from '@/types/globe';

/* ── Filter types ─────────────────────────────────────── */
export type RegionFilter =
  | 'all' | 'india' | 'asia' | 'europe' | 'americas' | 'africa' | 'oceania';

export type CategoryFilter =
  | 'all' | 'natural' | 'earthquake' | 'wildfire' | 'storm' | 'volcano'
  | 'tech' | 'business' | 'music' | 'sports' | 'admin';

export type SortOrder = 'newest' | 'severity' | 'region';

/* ── Bounding boxes for region filter ─────────────────── */
const REGION_BOUNDS: Record<RegionFilter, [number, number, number, number] | null> = {
  all:      null,
  india:    [6,   38,  67,  98],   // [latMin, latMax, lngMin, lngMax]
  asia:     [-10, 72,  26,  180],
  europe:   [35,  72,  -25, 45],
  americas: [-56, 72,  -170, -34],
  africa:   [-35, 38,  -18, 52],
  oceania:  [-50, 0,   110, 180],
};

export function applyGlobeFilter(
  events: GlobeEvent[],
  region: RegionFilter,
  category: CategoryFilter,
): GlobeEvent[] {
  return events.filter(ev => {
    /* ── Region filter ─────────────────────────────── */
    if (region !== 'all') {
      const bounds = REGION_BOUNDS[region];
      if (bounds) {
        const [latMin, latMax, lngMin, lngMax] = bounds;
        const inBounds =
          ev.lat >= latMin && ev.lat <= latMax &&
          ev.lng >= lngMin && ev.lng <= lngMax;

        // Also check country string for extra accuracy (India especially)
        const countryMatch = region === 'india'
          ? ev.country?.toLowerCase().includes('india')
          : false;

        if (!inBounds && !countryMatch) return false;
      }
    }

    /* ── Category filter ───────────────────────────── */
    if (category !== 'all') {
      const cat  = (ev.category ?? '').toLowerCase();
      const type = (ev.type     ?? '').toLowerCase();

      const naturalCats = ['wildfire','volcano','earthquake','flood','storm','severe storm','landslide','drought','ice event','dust','temperature','water event','snow'];

      if (category === 'natural')     return naturalCats.some(c => cat.includes(c) || type.includes(c));
      if (category === 'earthquake')  return cat.includes('earthquake');
      if (category === 'wildfire')    return cat.includes('wildfire') || cat.includes('fire');
      if (category === 'storm')       return cat.includes('storm');
      if (category === 'volcano')     return cat.includes('volcano');
      if (category === 'tech')        return ['technology','tech','science','conference','seminar'].some(c => cat.includes(c) || type.includes(c));
      if (category === 'business')    return ['business','finance','expo','trade show','conference'].some(c => cat.includes(c) || type.includes(c));
      if (category === 'music')       return cat.includes('music') || type.includes('music');
      if (category === 'sports')      return cat.includes('sport') || type.includes('sport');
      if (category === 'admin')       return ev.source === 'admin';
    }

    return true;
  });
}

/* ── Store ─────────────────────────────────────────────── */
interface GlobeStore {
  activeEvent:   GlobeEvent | null;
  popupScreen:   { x: number; y: number };
  hasInteracted: boolean;
  // Globe filter
  filterRegion:   RegionFilter;
  filterCategory: CategoryFilter;
  sortOrder:      SortOrder;

  setActiveEvent:    (event: GlobeEvent | null, screen?: { x: number; y: number }) => void;
  updatePopupScreen: (x: number, y: number) => void;
  setHasInteracted:  () => void;
  setFilterRegion:   (r: RegionFilter)   => void;
  setFilterCategory: (c: CategoryFilter) => void;
  setSortOrder:      (s: SortOrder)      => void;
  resetFilters:      () => void;
}

export const useGlobeStore = create<GlobeStore>((set) => ({
  activeEvent:    null,
  popupScreen:    { x: 0, y: 0 },
  hasInteracted:  false,
  filterRegion:   'all',
  filterCategory: 'all',
  sortOrder:      'newest',

  setActiveEvent:    (event, screen) =>
    set({ activeEvent: event, popupScreen: screen ?? { x: 0, y: 0 } }),
  updatePopupScreen: (x, y) => set({ popupScreen: { x, y } }),
  setHasInteracted:  () => set({ hasInteracted: true }),
  setFilterRegion:   (r) => set({ filterRegion: r }),
  setFilterCategory: (c) => set({ filterCategory: c }),
  setSortOrder:      (s) => set({ sortOrder: s }),
  resetFilters:      () => set({ filterRegion: 'all', filterCategory: 'all', sortOrder: 'newest' }),
}));
