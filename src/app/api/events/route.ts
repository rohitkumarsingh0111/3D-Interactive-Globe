// src/app/api/events/route.ts
// GET  /api/events        — list events (public: active only | admin: all)
// POST /api/events        — create event (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureSeeded, toGlobeEvent } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();

    const token    = req.cookies.get(COOKIE_NAME)?.value;
    const isAdmin  = !!token && verifyToken(token);

    const events = await prisma.event.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(events.map(toGlobeEvent));
  } catch (err) {
    console.error('[GET /api/events]', err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, city, country, lat, lng, users, category, duration, color } = body;

    if (!name || !city || !country || lat == null || lng == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        name:     String(name).trim(),
        city:     String(city).trim(),
        country:  String(country).trim(),
        lat:      parseFloat(lat),
        lng:      parseFloat(lng),
        users:    String(users || '0').trim(),
        category: String(category || 'General').trim(),
        duration: String(duration || '1 Day').trim(),
        color:    String(color || '#00FFFF').trim(),
        type:     'LIVE EVENT',
      },
    });

    return NextResponse.json(toGlobeEvent(event), { status: 201 });
  } catch (err) {
    console.error('[POST /api/events]', err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
