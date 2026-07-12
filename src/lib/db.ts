// src/lib/db.ts
// Prisma singleton — prevents multiple client instances in dev hot-reload
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Default events seeded on first run
const DEFAULT_EVENTS = [
  { city: 'Mumbai',          country: 'India',   lat: 19.08,  lng:  72.88,  name: 'Test Event 1', users: '1.2K', category: 'Technology', duration: '3 Days',  color: '#00FFFF' },
  { city: 'Paris',           country: 'France',  lat: 48.86,  lng:   2.35,  name: 'Test Event 2', users: '847',  category: 'Innovation', duration: '48 Hours', color: '#A855F7' },
  { city: 'Rio de Janeiro',  country: 'Brazil',  lat: -22.9,  lng: -43.17,  name: 'Test Event 3', users: '3.4K', category: 'Development',duration: '5 Days',  color: '#00FFFF' },
  { city: 'New York',        country: 'USA',     lat: 40.71,  lng: -74.01,  name: 'Test Event 4', users: '9.1K', category: 'Startups',   duration: '7 Days',  color: '#A855F7' },
] as const;

/**
 * Auto-seeds the database with 4 default events if it's empty.
 * Called from the GET /api/events handler on first request.
 */
export async function ensureSeeded(): Promise<void> {
  const count = await prisma.event.count();
  if (count === 0) {
    await prisma.event.createMany({ data: DEFAULT_EVENTS.map(e => ({ ...e })) });
  }
}
