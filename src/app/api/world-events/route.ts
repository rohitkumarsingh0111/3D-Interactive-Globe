// src/app/api/world-events/route.ts
// Aggregates real-time world events from three sources:
//   1. NASA EONET  — natural events (fires, storms, volcanoes, floods…)
//   2. USGS        — earthquakes M4.5+ worldwide
//   3. Ticketmaster — tech/business/music/sports events (needs free API key)
// No mandatory keys — Ticketmaster is optional (gracefully skipped if key absent).
// Cached 10 min server-side.

import { NextResponse } from 'next/server';
import type { GlobeEvent } from '@/types/globe';

/* ══════════════════════════════════════════════════════════
   COLOUR MAP
══════════════════════════════════════════════════════════ */
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

// Ticketmaster segment → color
const TM_COLOR: Record<string, string> = {
  'music':            '#FF6B9D',
  'sports':           '#4ade80',
  'arts & theatre':   '#A855F7',
  'film':             '#FF8C42',
  'miscellaneous':    '#00FFFF',
  'technology':       '#5EB8FF',
  'science':          '#38bdf8',
  'business':         '#FFD700',
  'conference':       '#5EB8FF',
  'family':           '#fb923c',
};

function tmColor(segment: string): string {
  return TM_COLOR[segment.toLowerCase()] ?? '#00FFFF';
}
function quakeColor(mag: number): string {
  if (mag >= 7.0) return '#FF2222';
  if (mag >= 6.0) return '#FF6B35';
  if (mag >= 5.5) return '#FFB648';
  return '#A855F7';
}
function hexToThree(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
function timeAgo(ms: number | string): string {
  const t = typeof ms === 'number' ? ms : new Date(ms).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function parseEonetLoc(title: string): { city: string; country: string } {
  const parts = title.split(',').map(s => s.trim());
  if (parts.length >= 3) return { city: parts[0], country: parts[parts.length - 1] };
  if (parts.length === 2) return { city: parts[0], country: parts[1] };
  return { city: title.slice(0, 30), country: 'Global' };
}
function parseUsgsPlace(place: string): { city: string; country: string } {
  const ofIdx = place.toLowerCase().indexOf(' of ');
  const loc = ofIdx >= 0 ? place.slice(ofIdx + 4) : place;
  const parts = loc.split(',').map(s => s.trim());
  if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
  return { city: loc.slice(0, 40), country: 'Unknown' };
}

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
interface EonetGeometry { date: string; type: string; coordinates: [number, number] | number[][]; }
interface EonetEvent   { id: string; title: string; categories: {id:string;title:string}[]; geometry: EonetGeometry[]; sources: {id:string;url:string}[]; }
interface UsgsFeature  { id: string; properties: {mag:number;place:string;time:number;url:string}; geometry: {coordinates:[number,number,number]}; }

interface TmVenue { name?: string; city?: {name:string}; country?: {name:string;countryCode:string}; location?: {latitude:string;longitude:string}; }
interface TmEvent {
  id: string; name: string; url?: string;
  dates?: { start?: { localDate?: string; localTime?: string }; };
  classifications?: { segment?: {name:string}; genre?: {name:string} }[];
  _embedded?: { venues?: TmVenue[] };
}

/* ══════════════════════════════════════════════════════════
   IN-MEMORY CACHE
══════════════════════════════════════════════════════════ */
let _cache: { data: GlobeEvent[]; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

/* ══════════════════════════════════════════════════════════
   ROUTE
══════════════════════════════════════════════════════════ */
export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(_cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  const events: GlobeEvent[] = [];
  const fetches: Promise<void>[] = [];

  /* ── 1. NASA EONET ──────────────────────────────────── */
  fetches.push((async () => {
    try {
      const res = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80&days=30',
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { events: EonetEvent[] };

      for (const ev of data.events) {
        const geoList = ev.geometry;
        if (!geoList?.length) continue;
        const geo = geoList[geoList.length - 1];
        if (geo.type !== 'Point') continue;
        const coords = geo.coordinates as [number, number];
        const [lng, lat] = coords;
        if (isNaN(lat) || isNaN(lng)) continue;

        const catId = ev.categories[0]?.id ?? 'manmade';
        const meta  = EONET_META[catId] ?? { label: 'Natural Event', color: '#00FFFF' };
        const { city, country } = parseEonetLoc(ev.title);

        events.push({
          id: `eonet_${ev.id}`,
          name: ev.title, city, country, lat, lng,
          type: meta.label.toUpperCase(),
          users: 'ACTIVE',
          category: meta.label,
          duration: timeAgo(geo.date),
          color: meta.color,
          threeColor: hexToThree(meta.color),
          source: 'world',
          url: ev.sources[0]?.url,
        });
      }
    } catch (err) {
      console.error('[world-events] EONET:', (err as Error).message);
    }
  })());

  /* ── 2. USGS Earthquakes ────────────────────────────── */
  fetches.push((async () => {
    try {
      const res = await fetch(
        'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&limit=80&orderby=time',
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { features: UsgsFeature[] };

      for (const f of data.features) {
        const [lng, lat] = f.geometry.coordinates;
        const { mag, place, time, url } = f.properties;
        if (isNaN(lat) || isNaN(lng) || isNaN(mag)) continue;

        const color = quakeColor(mag);
        const { city, country } = parseUsgsPlace(place ?? '');

        events.push({
          id: `usgs_${f.id}`,
          name: `M${mag.toFixed(1)} — ${place ?? 'Unknown'}`,
          city: city || place, country, lat, lng,
          type: 'EARTHQUAKE',
          users: `M${mag.toFixed(1)}`,
          category: 'Earthquake',
          duration: timeAgo(time),
          color, threeColor: hexToThree(color),
          source: 'world', severity: mag, url,
        });
      }
    } catch (err) {
      console.error('[world-events] USGS:', (err as Error).message);
    }
  })());

  /* ── 3. Ticketmaster Discovery API ──────────────────── */
  const tmKey = process.env.TICKETMASTER_KEY;
  if (tmKey) {
    // Fetch global tech/business/science events + India all-categories separately
    const tmEndpoints = [
      // Global tech, science, business conferences
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmKey}&size=50&sort=date,asc&classificationName=technology,science,conference,seminar,business,expo`,
      // India — all event types
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmKey}&size=50&sort=date,asc&countryCode=IN`,
    ];

    for (const url of tmEndpoints) {
      fetches.push((async () => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) return;
          const data = await res.json() as { _embedded?: { events?: TmEvent[] } };
          const tmEvents = data._embedded?.events ?? [];

          for (const ev of tmEvents) {
            const venue = ev._embedded?.venues?.[0];
            if (!venue?.location?.latitude) continue;
            const lat = parseFloat(venue.location.latitude);
            const lng = parseFloat(venue.location.longitude ?? '0');
            if (isNaN(lat) || isNaN(lng)) continue;

            const segment = ev.classifications?.[0]?.segment?.name ?? 'Miscellaneous';
            const genre   = ev.classifications?.[0]?.genre?.name ?? '';
            const cat     = genre && genre !== 'Undefined' ? genre : segment;
            const color   = tmColor(segment);

            // Event date as duration
            const dateStr = ev.dates?.start?.localDate;
            const timeStr = ev.dates?.start?.localTime ?? '';
            const when = dateStr
              ? `${dateStr}${timeStr ? ' ' + timeStr.slice(0,5) : ''}`
              : 'TBD';

            events.push({
              id: `tm_${ev.id}`,
              name: ev.name,
              city:    venue.city?.name ?? 'Unknown',
              country: venue.country?.name ?? 'Unknown',
              lat, lng,
              type:    segment.toUpperCase(),
              users:   'UPCOMING',
              category: cat,
              duration: when,
              color, threeColor: hexToThree(color),
              source: 'world',
              url: ev.url,
            });
          }
        } catch (err) {
          console.error('[world-events] Ticketmaster:', (err as Error).message);
        }
      })());
    }
  }

  await Promise.all(fetches);

  // Deduplicate by id (Ticketmaster India query may overlap global)
  const seen = new Set<string>();
  const deduped = events.filter(ev => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });

  _cache = { data: deduped, ts: Date.now() };
  return NextResponse.json(deduped, { headers: { 'X-Cache': 'MISS' } });
}
