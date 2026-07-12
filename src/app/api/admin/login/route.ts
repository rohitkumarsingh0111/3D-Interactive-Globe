// src/app/api/admin/login/route.ts
// POST /api/admin/login — validates admin password and sets session cookie
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      // Slight delay to prevent brute-force timing
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[POST /api/admin/login]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
