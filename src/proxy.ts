// src/proxy.ts
// Protects /admin/* routes — redirects unauthenticated users to login
// Renamed from middleware.ts → proxy.ts (Next.js 16 convention)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and API routes
  if (pathname === '/admin/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect all /admin/* routes — just check cookie exists
  // Full HMAC verification happens in /api/admin/verify (Node.js runtime)
  if (pathname.startsWith('/admin')) {
    const hasCookie = request.cookies.has('globex-admin-token');
    if (!hasCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
