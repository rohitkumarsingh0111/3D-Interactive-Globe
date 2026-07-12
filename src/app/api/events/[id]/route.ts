// src/app/api/events/[id]/route.ts
// GET    /api/events/:id   — get single event
// PUT    /api/events/:id   — update event (admin only)
// DELETE /api/events/:id   — delete event (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { prisma, toGlobeEvent } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return !!token && verifyToken(token);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(toGlobeEvent(event));
  } catch (err) {
    console.error('[GET /api/events/:id]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, city, country, lat, lng, users, category, duration, color, isActive } = body;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(name     !== undefined && { name:     String(name).trim() }),
        ...(city     !== undefined && { city:     String(city).trim() }),
        ...(country  !== undefined && { country:  String(country).trim() }),
        ...(lat      !== undefined && { lat:      parseFloat(lat) }),
        ...(lng      !== undefined && { lng:      parseFloat(lng) }),
        ...(users    !== undefined && { users:    String(users).trim() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(duration !== undefined && { duration: String(duration).trim() }),
        ...(color    !== undefined && { color:    String(color).trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json(toGlobeEvent(updated));
  } catch (err) {
    console.error('[PUT /api/events/:id]', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/events/:id]', err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
