// src/lib/db.ts
// Prisma client with libsql adapter — works with local SQLite and remote Turso
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');

  // DATABASE_AUTH_TOKEN is required for remote Turso; ignored for local file: URLs
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ── Helper ──────────────────────────────────────────────────────
/** Converts a CSS hex color string to a Three.js integer */
export function hexToThreeColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Transforms a DB event row to a GlobeEvent (adds threeColor) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGlobeEvent(ev: any) {
  return {
    id:         ev.id,
    city:       ev.city,
    country:    ev.country,
    lat:        ev.lat,
    lng:        ev.lng,
    name:       ev.name,
    type:       ev.type,
    users:      ev.users,
    category:   ev.category,
    duration:   ev.duration,
    color:      ev.color,
    threeColor: hexToThreeColor(ev.color),
    isActive:   ev.isActive,
  };
}

// ── Auto-seed ────────────────────────────────────────────────────
const DEFAULT_EVENTS = [
  { city: 'Mumbai',         country: 'India',  lat: 19.08,  lng:  72.88, name: 'Test Event 1', users: '1.2K', category: 'Technology', duration: '3 Days',   color: '#00FFFF' },
  { city: 'Paris',          country: 'France', lat: 48.86,  lng:   2.35, name: 'Test Event 2', users: '847',  category: 'Innovation', duration: '48 Hours', color: '#A855F7' },
  { city: 'Rio de Janeiro', country: 'Brazil', lat: -22.9,  lng: -43.17, name: 'Test Event 3', users: '3.4K', category: 'Development',duration: '5 Days',   color: '#00FFFF' },
  { city: 'New York',       country: 'USA',    lat: 40.71,  lng: -74.01, name: 'Test Event 4', users: '9.1K', category: 'Startups',   duration: '7 Days',   color: '#A855F7' },
];

export async function ensureSeeded(): Promise<void> {
  const count = await prisma.event.count();
  if (count === 0) {
    await prisma.event.createMany({ data: DEFAULT_EVENTS.map(e => ({ ...e })) });
  }
}
