// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlobeX — 3D Interactive Global Event Platform',
  description:
    'A futuristic 3D interactive Earth globe with real-time live event markers, glassmorphic pop-ups, and smooth zoom-to-location interaction. Built with Next.js 14, React Three Fiber, and WebGL.',
  keywords: ['3D globe', 'interactive map', 'Three.js', 'React Three Fiber', 'WebGL', 'Next.js', 'live events', 'spatial UI'],
  authors: [{ name: 'GlobeX' }],
  openGraph: {
    title: 'GlobeX — 3D Interactive Global Event Platform',
    description: 'Real-time 3D Earth Globe with live event markers and zoom-to-location.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
