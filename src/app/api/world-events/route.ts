// src/app/api/world-events/route.ts
// Aggregates real-time world events from two free public APIs:
//   1. NASA EONET  — natural events (fires, storms, volcanoes, floods…)
//   2. USGS        — earthquakes M4.5+ worldwide
// No API keys required. Cached 10 min server-side.

import { NextResponse } from 'next/server';
import type { GlobeEvent } from '@/types/globe';

/* ── Category metadata (EONET category IDs → display info) ──── */
const EONET_META: Record<string, { label: string; color: string }> = {
  wildfires:    { label: 'Wildfire',      color: '#FF4444' },
  volcanoes:    { label: 'Volcano',       color: '#FF6B35' },
  severeStorms: { label: 'Severe Storm',  color: '#5EB8FF' },
  floods:       { label: 'Flood',         color: '#4ade80' },
  landslides:   { label: 'Landslide',     color: '#FFB648' },
  seaLakeIce:   { label: 'Ice Event',     color: '#a0d8ef' },
  drought:      { label: 'Drought',       color: '#FFD700' },
  dustHaze:     { label: 'Dust & Haze',   color: '#D4A574' },
  manmade:      { label: 'Man-made',      color: '#00FFFF' },
  temperature:  { label: 'Extreme Heat',  color: '#FF8C42' },
  waterColor:   { label: 'Water Event',   color: '#38bdf8' },
  snow:         { label: 'Snow & Ice',    color: '#e0f2fe' },
};

/* ── Utilities ──────────────────────────────────────────────── */
function hexToThree(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function quakeColor(mag: number): string {
  if (mag >= 7.0) return '#FF2222';
  if (mag >= 6.0) return '#FF6B35';
  if (mag >= 5.5) return '#FFB648';
  return '#A855F7';
}

function timeAgo(ms: number | string): string {
  const t = typeof ms === 'number' ? ms : new Date(ms).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseEonetLoc(title: string): { city: string; country: string } {
  // e.g. "Thomas Fire, California, United States"
  // e.g. "Kilauea Volcano, Hawaii, USA"
  const parts = title.split(',').map(s => s.trim());
  if (parts.length >= 3) return { city: parts[0], country: parts[parts.length - 1] };
  if (parts.length === 2) return { city: parts[0], country: parts[1] };
  return { city: title.slice(0, 30), country: 'Global' };
}

function parseUsgsPlace(place: string): { city: string; country: string } {
  // e.g. "5km NW of Ridgecrest, California, United States"
  // e.g. "150km SSE of Amatignak Island, Alaska"
  const ofIdx = place.toLowerCase().indexOf(' of ');
  const loc = ofIdx >= 0 ? place.slice(ofIdx + 4) : place;
  const parts = loc.split(',').map(s => s.trim());
  if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
  return { city: loc.slice(0, 40), country: 'Unknown' };
}

/* ── In-memory cache ────────────────────────────────────────── */
let _cache: { data: GlobeEvent[]; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/* ── NASA EONET types ───────────────────────────────────────── */
interface EonetGeometry {
  date: string;
  type: string;
  coordinates: [number, number] | [number, number][];
}
interface EonetEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  geometry: EonetGeometry[];
  sources: { id: string; url: string }[];
}

/* ── USGS GeoJSON types ─────────────────────────────────────── */
interface UsgsFeature {
  id: string;
  properties: { mag: number; place: string; time: number; url: string; status: string };
  geometry: { type: string; coordinates: [number, number, number] };
}

/* ══════════════════════════════════════════════════════════════
   ROUTE HANDLER
══════════════════════════════════════════════════════════════ */
export async function GET() {
  // Serve from cache if fresh
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(_cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=600', 'X-Cache': 'HIT' },
    });
  }

  const events: GlobeEvent[] = [];
  const fetches: Promise<void>[] = [];

  /* ── 1. NASA EONET ──────────────────────────────────────── */
  fetches.push(
    (async () => {
      try {
        const res = await fetch(
          'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80&days=30',
          { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { events: EonetEvent[] };

        for (const ev of data.events) {
          // Use the most recent geometry point
          const geoList = ev.geometry;
          if (!geoList?.length) continue;
          const geo = geoList[geoList.length - 1];
          if (geo.type !== 'Point') continue;

          const coords = geo.coordinates as [number, number];
          const [lng, lat] = coords;
          if (typeof lat !== 'number' || typeof lng !== 'number') continue;
          if (isNaN(lat) || isNaN(lng)) continue;

          const catId = ev.categories[0]?.id ?? 'manmade';
          const meta  = EONET_META[catId] ?? { label: 'Natural Event', color: '#00FFFF' };
          const { city, country } = parseEonetLoc(ev.title);

          events.push({
            id:        `eonet_${ev.id}`,
            name:      ev.title,
            city,
            country,
            lat,
            lng,
            type:      meta.label.toUpperCase(),
            users:     'ACTIVE',
            category:  meta.label,
            duration:  timeAgo(geo.date),
            color:     meta.color,
            threeColor: hexToThree(meta.color),
            source:    'world',
            url:       ev.sources[0]?.url,
          });
        }
      } catch (err) {
        console.error('[world-events] EONET error:', (err as Error).message);
      }
    })()
  );

  /* ── 2. USGS Earthquakes ────────────────────────────────── */
  fetches.push(
    (async () => {
      try {
        const res = await fetch(
          'https://earthquake.usgs.gov/fdsnws/event/1/query?' +
          'format=geojson&minmagnitude=4.5&limit=80&orderby=time',
          { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { features: UsgsFeature[] };

        for (const f of data.features) {
          const [lng, lat] = f.geometry.coordinates;
          const { mag, place, time, url } = f.properties;
          if (typeof lat !== 'number' || typeof lng !== 'number') continue;
          if (isNaN(lat) || isNaN(lng) || isNaN(mag)) continue;

          const color  = quakeColor(mag);
          const { city, country } = parseUsgsPlace(place ?? '');
          const severity =
            mag >= 7.0 ? 'MAJOR' :
            mag >= 6.0 ? 'STRONG' :
            mag >= 5.5 ? 'MODERATE' : 'MINOR';

          events.push({
            id:        `usgs_${f.id}`,
            name:      `M${mag.toFixed(1)} — ${place ?? 'Unknown'}`,
            city:      city || place,
            country,
            lat,
            lng,
            type:      'EARTHQUAKE',
            users:     `M${mag.toFixed(1)}`,
            category:  'Earthquake',
            duration:  timeAgo(time),
            color,
            threeColor: hexToThree(color),
            source:    'world',
            severity:  mag,
            url,
          });
        }
      } catch (err) {
        console.error('[world-events] USGS error:', (err as Error).message);
      }
    })()
  );

  // Run both fetches in parallel
  await Promise.all(fetches);

  // Sort: most recent (duration) first — already ordered from APIs, just merge
  _cache = { data: events, ts: Date.now() };

  return NextResponse.json(events, {
    headers: { 'Cache-Control': 'public, s-maxage=600', 'X-Cache': 'MISS' },
  });
}
