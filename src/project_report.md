# GlobeX — Project Report
### Frontend Developer Assessment · 3D Interactive Globe

---

## 1. Project Overview

**GlobeX** is a production-grade, immersive **3D Earth Globe** web application built as a Frontend Developer Assessment task. It renders a physically realistic, interactive globe of the Earth with real-time live event markers, glassmorphic popups, and smooth zoom-to-location interaction — all running at 60fps in the browser using WebGL.

| | |
|---|---|
| **Project name** | `cyber-globe-next` |
| **App title** | GlobeX — 3D Interactive Global Event Platform |
| **Location** | `/Users/anand/.gemini/antigravity/scratch/cyber-globe-next` |
| **Dev server** | `http://localhost:3000` |
| **Total source lines** | **1,673 TS/TSX** + **761 CSS** = **2,434 lines** |
| **Build status** | ✅ Compiles clean — TypeScript + Turbopack |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.10 |
| **UI Library** | React | 19.2.4 |
| **3D Engine** | Three.js | ^0.185.1 |
| **React 3D Bindings** | React Three Fiber (R3F) | ^9.6.1 |
| **3D Helpers** | @react-three/drei | ^10.7.7 |
| **Animation** | Framer Motion | ^12.42.2 |
| **State Management** | Zustand | ^5.0.14 |
| **Styling** | Tailwind CSS v4 + Vanilla CSS | ^4 |
| **Language** | TypeScript (strict) | ^5 |
| **Build Tool** | Turbopack (Next.js bundler) | built-in |
| **Fonts** | Outfit + JetBrains Mono | Google Fonts |

---

## 3. Architecture

```
cyber-globe-next/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — SEO metadata, fonts, viewport
│   │   ├── page.tsx            # Home page — composes all layers (68 lines)
│   │   └── globals.css         # Full design system (761 lines)
│   │
│   ├── components/
│   │   ├── scene/              # WebGL / Three.js layer (SSR-disabled)
│   │   │   ├── GlobeScene.tsx  # ROOT — Canvas, camera controller, all scene children (386 lines)
│   │   │   ├── EventMarker.tsx # Pulsing sprite markers per city (140 lines)
│   │   │   ├── StarField.tsx   # 5,000-star background (74 lines)
│   │   │   ├── Atmosphere.tsx  # (kept, unused — blue glow removed per request)
│   │   │   ├── DottedGlobe.tsx # (kept, unused — replaced by physical Earth)
│   │   │   ├── GlobeGrid.tsx   # (kept, unused — replaced by physical Earth)
│   │   │   └── PhysicalGlobe.tsx # (draft — superseded by inline EarthGlobe)
│   │   │
│   │   └── ui/                 # DOM overlay layer (above the canvas)
│   │       ├── EventPopup.tsx  # Premium spatial popup card (217 lines)
│   │       ├── Header.tsx      # Top navigation bar (51 lines)
│   │       ├── SidePanel.tsx   # Right-side event list (37 lines)
│   │       ├── StatusBar.tsx   # Bottom FPS + system stats (57 lines)
│   │       └── LoadingScreen.tsx # Animated loading screen (47 lines)
│   │
│   ├── data/
│   │   └── events.ts           # 4 live event definitions — Mumbai, Paris, Rio, NYC (62 lines)
│   │
│   ├── types/
│   │   └── globe.ts            # TypeScript interfaces: GlobeEvent, PopupState (22 lines)
│   │
│   ├── store/
│   │   └── globeStore.ts       # Zustand store — popup state + interaction tracking (22 lines)
│   │
│   └── lib/
│       └── geoUtils.ts         # lat/lng → THREE.Vector3 spherical math (20 lines)
│
└── public/
    └── textures/               # Earth texture maps (1.3 MB total, served locally)
        ├── earth_day.jpg       # 2048px day texture (501 KB)
        ├── earth_normal.jpg    # 2048px normal map (329 KB)
        ├── earth_specular.jpg  # 2048px specular map (218 KB)
        └── earth_clouds.png    # 1024px cloud layer (254 KB)
```

---

## 4. Core Features

### 🌍 4.1 Physical 3D Earth Globe
- Rendered with **`MeshPhongMaterial`** using 3 real texture maps:
  - **Day texture** — NASA-sourced 2048px Earth photograph
  - **Normal map** — Surface terrain bump (mountains, ocean ridges)
  - **Specular map** — Ocean reflectivity vs land matte differentiation
- **128×128 sphere segments** — ultra-smooth silhouette at any zoom level
- **Cloud layer** — separate transparent mesh (`opacity: 0.38`) drifting slightly faster than surface (`+0.008 rad/s` extra rotation)
- Both Earth surface and clouds are inside **one `<group name="globe-group">`** so they rotate as a unit — no speed mismatch

### 🎥 4.2 Custom Camera Controller
> This is the most technically complex part of the project.

OrbitControls was **completely replaced** with a custom `CameraController` component because OrbitControls always zooms toward the globe center — not toward the point under the cursor.

**Zoom-to-cursor maths:**
```
hitPoint  = raycast(cursorPos) → point on globe surface (THREE.Sphere intersection)
direction = normalize(hitPoint − camera.position)
travel    = |hitPoint − camera.position| × (1 − zoomFactor)
newCamera = camera.position + direction × travel
```
- `zoomFactor < 1` → travel is positive → camera moves **toward** hit point
- `zoomFactor > 1` → travel is negative → camera pulls **away** from hit point

All transitions use **framerate-independent exponential damping:**
```
α = 1 − e^(−12 × deltaTime)
```

| Interaction | Behaviour |
|---|---|
| **Scroll wheel** | Zoom toward globe surface point under cursor |
| **Click + drag** | Rotate camera around globe centre (spherical θ/φ) |
| **Two-finger pinch** | Zoom toward midpoint between fingers (raycasted) |
| **Single finger drag** | Rotate (touch equivalent of drag) |

### 💡 4.3 Lighting
Three-light rig that makes the dark side visible without being flat:

| Light | Type | Position | Purpose |
|---|---|---|---|
| Sun | DirectionalLight | `[4, 2, 3]` | Main warm sunlight (`#FFFCF0`) |
| Hemisphere | HemisphereLight | global | Sky blue-white + space ground — prevents pitch-black dark side |
| Earthshine | DirectionalLight | `[-5, -1, -4]` | Faint fill from opposite side — softens terminator |

### 📍 4.4 Event Markers
- **4 cities:** Mumbai, Paris, Rio de Janeiro, New York
- Each marker = two sprites: a **glowing core** + **expanding ping ring**
- Ping ring animated with `useFrame`: scales `0.14 → 0.44` while opacity fades `0.9 → 0`
- Markers live **inside** the rotating globe group → they stay pinned to their lat/lng as the globe spins
- Click uses `sprite.getWorldPosition()` to project the 3D world-space position (after group rotation) to accurate 2D screen coordinates

### 🃏 4.5 Premium Spatial Popup Card
Triggered by clicking any event marker:

| Element | Implementation |
|---|---|
| **Rotating border ring** | `conic-gradient` with `@property --sp-angle` CSS animation |
| **Corner brackets** | 4 absolute-positioned `<div>` elements with selective border-width |
| **Signal bars** | 5 divs of increasing height, cyan→purple gradient |
| **BROADCASTING LIVE** | Dual animation: expanding ring + blinking core dot |
| **Hero name** | 22px `linear-gradient` text clip (`white → sky blue → lavender`) |
| **Coordinates** | Real lat/lng from event data, formatted `19.08°N / 72.88°E` |
| **User counter** | Animated ticker counts up from 0 to value over 28 frames |
| **Scan line** | Absolutely positioned glowing bar sweeping across divider |
| **Stat tiles** | 2×2 grid — Active Users, Status (green), Category (purple), Duration |
| **↑12% trend badge** | Absolute-positioned on primary stat tile |
| **JOIN EVENT CTA** | Cyan→purple gradient border, arrow slides on hover |
| **Scanlines texture** | `repeating-linear-gradient` overlay for CRT/holographic feel |
| **Entry animation** | Framer Motion spring: `scale 0.88→1` + `blur 4px→0` + `y 16→0` |

### ⭐ 4.6 Star Field
- **5,000 stars** rendered in **1 draw call** using `THREE.Points` + `BufferGeometry`
- Random positions on a sphere of radius 400 units
- Random size variation (`0.5–3px`) using `sizeAttenuation`

---

## 5. Design System (`globals.css`)

| Token | Value | Usage |
|---|---|---|
| `--bg-void` | `#0A0A1A` | Page + canvas background |
| `--cyan` | `#00FFFF` | Primary accent — markers, borders, values |
| `--purple` | `#8A2BE2` | Secondary accent — atmosphere, gradients |
| `--purple-light` | `#A855F7` | UI text accents |
| `--glass-bg` | `rgba(8,8,28,0.65)` | Glassmorphic surfaces |
| `--font-main` | Outfit | All body + heading text |
| `--font-mono` | JetBrains Mono | Data labels, coordinates, badges |

**CSS features used:**
- `backdrop-filter: blur() saturate()` — glassmorphism
- `@property` custom CSS Houdini property — rotating conic gradient border
- `conic-gradient` — spinning border ring on popup
- `repeating-linear-gradient` — scanlines texture
- CSS `animation` — scan line sweep, live dot pulse, ping ring expand
- `background-clip: text` — gradient text on event name

---

## 6. Data Layer

### Events (`src/data/events.ts`)
```
Test Event 1 — Mumbai, India       (19.08°N, 72.88°E)  1.2K users  Cyan marker
Test Event 2 — Paris, France       (48.86°N,  2.35°E)  847  users  Purple marker
Test Event 3 — Rio de Janeiro, BR  (22.90°S, 43.17°W)  3.4K users  Cyan marker
Test Event 4 — New York, USA       (40.71°N, 74.01°W)  9.1K users  Purple marker
```

### State (`src/store/globeStore.ts` — Zustand)
```typescript
{
  activeEvent: GlobeEvent | null      // currently open popup
  popupScreen: { x: number, y: number } // 2D screen position of popup
  hasInteracted: boolean              // used for hint text visibility
}
```

### Geo Math (`src/lib/geoUtils.ts`)
```typescript
// Converts geographic coordinates to 3D Cartesian (on unit sphere):
lat/lng → THREE.Vector3(x, y, z)
```

---

## 7. Performance Decisions

| Decision | Rationale |
|---|---|
| `dpr={[1, 2]}` cap | Prevents 3x DPR on retina screens burning GPU |
| `dynamic(() => import(...), { ssr: false })` | Three.js never runs on server — avoids SSR crash |
| Stars as `BufferGeometry Points` | 5,000 stars = 1 draw call, not 5,000 meshes |
| `useTexture([...])` array form | Loads all 4 textures in parallel via Suspense |
| Textures stored in `/public/` | Zero CDN latency, no CORS issues |
| `anisotropy: 16` on day map | Eliminates blurring at oblique viewing angles |
| `depthWrite: false` on clouds + stars | Prevents z-fighting artifacts |
| `THREE.ACESFilmicToneMapping` | Cinema-grade HDR tone mapping in one line |
| Exponential damping `1-e^(-12t)` | Framerate-independent smooth feel on all devices |
| Markers inside globe group | No per-frame matrix recalculation — transform is inherited |
| `getWorldPosition()` for click | Correct screen projection after group rotation |

---

## 8. File Size Summary

| File | Lines | Purpose |
|---|---|---|
| `GlobeScene.tsx` | 386 | Main 3D scene — globe, lighting, camera, markers |
| `globals.css` | 761 | Full design system + all component styles |
| `EventPopup.tsx` | 217 | Premium spatial popup card |
| `EventMarker.tsx` | 140 | Pulsing city markers |
| `Atmosphere.tsx` | 112 | Atmosphere shader (built, available) |
| `page.tsx` | 68 | Home page composition |
| `events.ts` | 62 | Event data |
| `Header.tsx` | 51 | Top navigation |
| `StatusBar.tsx` | 57 | Bottom stats bar |
| `layout.tsx` | 39 | Root layout + SEO |
| **Total** | **2,434** | |

### Public Assets
| File | Size |
|---|---|
| `earth_day.jpg` | 501 KB |
| `earth_normal.jpg` | 329 KB |
| `earth_clouds.png` | 254 KB |
| `earth_specular.jpg` | 218 KB |
| **Total textures** | **1.3 MB** |

---

## 9. Assessment Requirements Checklist

| Requirement | Status | Implementation |
|---|---|---|
| 3D interactive globe | ✅ | Three.js sphere + MeshPhongMaterial + real textures |
| Auto-rotate | ✅ | `globeGroupRef.rotation.y += delta * 0.06` in `useFrame` |
| Drag to rotate | ✅ | Custom mouse/touch drag → spherical θ/φ |
| Pinch to zoom | ✅ | Two-finger touch → midpoint raycast → zoom toward point |
| Zoom to cursor location | ✅ | Custom raycasting camera controller |
| Neon pulsing markers | ✅ | Sprite-based markers with canvas-drawn glow textures |
| Glassmorphic popup | ✅ | `backdrop-filter: blur(32px)` + Framer Motion animations |
| Event Name field | ✅ | "Test Event 1–4" (per assessment spec) |
| Location field | ✅ | "Mumbai, India" etc. with coordinates |
| Status: 🔴 LIVE | ✅ | "BROADCASTING LIVE" badge with double pulse ring |
| Active Users field | ✅ | Animated counter ticker (0 → value) |
| Deep dark background | ✅ | `#0A0A1A` Cosmic Void |
| Electric Purple accent | ✅ | `#8A2BE2` / `#A855F7` throughout |
| Cyber Cyan accent | ✅ | `#00FFFF` throughout |
| React / Next.js | ✅ | Next.js 16.2 App Router |
| Three.js / WebGL | ✅ | Three.js 0.185 + React Three Fiber |
| TypeScript | ✅ | Full strict TypeScript |
| Mobile optimised | ✅ | Touch drag, pinch zoom, DPR capping |
| Premium UI | ✅ | Glassmorphism, scanlines, rotating border ring, spatial design |

---

## 10. Running the Project

```bash
# Navigate to project
cd /Users/anand/.gemini/antigravity/scratch/cyber-globe-next

# Install dependencies (already done)
npm install

# Start development server
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod
```

---

## 11. Known Improvements (Future Scope)

| Item | Detail |
|---|---|
| Night-side city lights | Add `earth_lights_2048.png` texture blended on dark side via custom shader |
| Marker clustering | When zoomed out far, group nearby markers to reduce visual noise |
| URL-based deep-linking | `/event/mumbai` could open the popup on load |
| Real-time data | Replace static event data with a WebSocket or polling API |
| Accessibility | Add keyboard navigation for markers and popup |
| PWA / offline | Service Worker to cache textures for offline use |
| Search / filter | Search box to find and fly to a city on the globe |
