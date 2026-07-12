// src/app/api/geocode/route.ts
// Proxy to OpenStreetMap Nominatim — returns coordinate suggestions for
// any city, state, or country query. No API key needed.
import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  name?: string;
}

export interface GeoSuggestion {
  displayName: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}` +
      `&format=json&limit=7&addressdetails=1&accept-language=en`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GlobeX-AdminPanel/1.0 (contact@globex.app)',
        'Accept': 'application/json',
      },
      // Respect Nominatim's usage policy — 1 req/sec is fine for admin use
      cache: 'no-store',
    });

    if (!res.ok) return NextResponse.json([]);

    const data: NominatimResult[] = await res.json();

    const suggestions: GeoSuggestion[] = data.map((item) => {
      const addr = item.address ?? {};
      const city =
        addr.city || addr.town || addr.village || addr.county || item.name || q;

      return {
        displayName: item.display_name,
        city:    city.trim(),
        state:   addr.state?.trim() || '',
        country: addr.country?.trim() || '',
        lat:     parseFloat(item.lat),
        lng:     parseFloat(item.lon),
      };
    });

    return NextResponse.json(suggestions);
  } catch (err) {
    console.error('[GET /api/geocode]', err);
    return NextResponse.json([]);
  }
}
