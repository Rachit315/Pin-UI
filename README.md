<div align="center">
  <img src="Logo/Logo.svg" alt="Pin UI Logo" width="100" />
  <h1>Pin UI</h1>
  <p><strong>Cool UI components for GenZ & Vibecoders.</strong></p>
  <p>A high-craft waitlist & showcase experience engineered with Next.js App Router, Motion, and Karplus-Strong physical audio synthesis.</p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-087ea4?style=flat-square&logo=react" alt="React" /></a>
    <a href="https://motion.dev/"><img src="https://img.shields.io/badge/Motion-v13-f08?style=flat-square" alt="Motion" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=flat-square&logo=supabase" alt="Supabase" /></a>
  </p>
</div>

---

## ⚡ Overview

**Pin UI** is a digital stage and interactive waitlist crafted for modern developers and creators. Built with obsessive attention to craft, micro-interactions, and design engineering, it combines physics-based animations, mathematical acoustic modeling, and zero-flash theme persistence.

### Key Pages

| Route | Purpose | Description |
| :--- | :--- | :--- |
| `/` | **Landing Stage** | Ultra-minimalist hero: one line, one link, centered. The hover arrow emerges seamlessly out of zero width. |
| `/waitlist` | **Waitlist Experience** | Interactive 3-stage progressive registration, floating demo strip, and a personalized digital access pass. |

---

## ✨ Features & Craft

- 🎯 **Progressive Reveal Form**: Starts as a single email input; dynamically expands into handle and consent fields on focus using Motion `layout` without jumping or shifting layout unexpectedly.
- 🌊 **Seamless Floating Demo Strip**: Drifting interactive preview cards under a bespoke 6-layer progressive `backdrop-filter` blur (ramping smoothly from 0 to 12px) running on the GPU off the main thread.
- 🎸 **Karplus-Strong Sound Engine**: Zero audio samples or external audio downloads. All interaction audio is physically synthesized in real time via JavaScript and the Web Audio API using Karplus-Strong noise-feedback string modeling.
- 🎟️ **Algorithmic Digital Ticket**: After joining, visitors receive a personalized vector access ticket with dynamic client-side font fitting, deterministic handle-hashed barcode symbology, high-resolution canvas PNG download, and 1-click X sharing.
- 🎨 **Instant Dual-Theme System**: Switch between Default Light (crimson on white) and Crimson (white on crimson) via the interactive pin mark, synchronized with localStorage, SSR-safe, and instantly tied to SVG tab favicons.
- 🔒 **Zero-Exposure Supabase Security**: PostgREST waitlist API with Row-Level Security enabled and zero table grants. Interactions route through a strictly secured `SECURITY DEFINER` PostgreSQL function with rate limiting.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `>= 20.9.0`
- **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rachit315/Pin-UI.git
   cd Pin-UI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials (optional for local mock testing):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3100
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3100](http://localhost:3100) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🏗️ Project Structure

```text
Pin UI/
├── app/
│   ├── api/waitlist/route.ts       # Secure serverless signup endpoint
│   ├── waitlist/page.tsx           # Interactive waitlist page
│   ├── globals.css                 # Design tokens, typography & CSS animations
│   ├── layout.tsx                  # Root layout & SSR theme bootstrap
│   ├── page.tsx                    # Minimalist landing stage
│   ├── robots.ts & sitemap.ts      # Automated SEO endpoints
│   └── opengraph-image.png         # Social preview cards
├── components/
│   ├── BrandMark.tsx               # Theme switcher pin & brand mark
│   ├── MediaStrip.tsx              # Progressive blur floating demo strip
│   ├── TicketShape.tsx             # Vector access pass SVG
│   ├── WaitlistForm.tsx            # Progressive 3-step waitlist form
│   ├── WelcomePanel.tsx            # Post-signup state with barcode & pass
│   └── ...                         # Supporting UI components
├── lib/
│   ├── sound.ts                    # Karplus-Strong physical audio synthesizer
│   ├── motion.ts                   # Unified spring physics definitions
│   ├── theme.ts                    # SSR sync external store for theme state
│   ├── art.ts                      # High-res vector canvas PNG ticket renderer
│   └── waitlist.ts                 # Direct-fetch Supabase PostgREST client
├── public/
│   ├── demo/                       # Demo video clips for floating strip
│   └── icons & favicons            # Light/crimson dynamic theme icons
└── supabase/                       # Supabase schema & secure RPC functions
```

---

## 🔬 Architectural Deep Dive

### 1. The Form Reveals Itself

The registration form is designed as a single continuous flow rather than multi-step wizard screens:
1. Opens as a single **Email** field above the action button.
2. Focusing the email row drops in the **X / Twitter handle** field.
3. Focusing the handle drops in the **consent** confirmation line.

Rows only ever expand; focus never makes the form jerk or jump downwards. The container recenters itself dynamically within the viewport using Motion `layout` transitions. Submitting early automatically reveals the required row with descriptive feedback.

### 2. The Floating Demo Strip & Progressive Blur

Three interactive preview cards drift sideways across the lower stage:
- **Progressive Blur**: Six stacked `backdrop-filter` layers compound into a continuous haze ramping from `0` to `12px` without edge halation or banding.
- **Off-the-Main-Thread**: The drift is managed via CSS animation (`animation-play-state: paused` on hover) while individual cards use Motion spring transforms.
- **Active Playback**: Only an expanded card plays media on loop; others sit paused on their first frame to conserve memory and decode performance.
- **Interactive Escape**: Click any card to pop it `120px` clear of the strip with a 10% scale up. Press <kbd>Esc</kbd> or click outside to dismiss.

### 3. Karplus-Strong Physical Sound Engine

Rather than loading pre-recorded audio files (`.mp3`/`.wav`) that produce network overhead and latency, interaction sounds are synthesized in real time via physical modeling:
- A one-period buffer filled with white noise is fed through an internal single-pole lowpass filter (`AudioBuffer`).
- The noise reorganizes into pitch while higher frequencies decay naturally, matching the timbre of an acoustic plucked string.
- Damping coefficients are analytically solved per-pitch to balance high shimmer notes (`1760Hz`) with low resonant roots (`293Hz`).
- `playOpen`, `playClose`, and `playConfirm` provide tactile, auditory confirmation for navigation and submissions.

### 4. Digital Ticket & Vector Canvas Export

Upon signup, an access ticket is dynamically rendered on stage:
- **Dynamic Type Fitting**: Long emails automatically downscale half a pixel at a time down to `11px` (`useTicketType`) so addresses never wrap or clip.
- **Deterministic Barcode**: Barcode guard pairs and thin-weighted bar distributions are computed from a SHA hash of the user's handle.
- **Canvas PNG Export**: Renders exact SVG vector paths directly to an off-screen `<canvas>` at device pixel ratio, reading active CSS variables to match the selected theme.
- **Native Sharing**: One-click composer link pre-fills X posts with verified handles and canonical references.

### 5. Dual-Theme Architecture

Toggle between **Light** and **Crimson** by clicking the brand pin:

| Token | Light (Default) | Crimson |
| :--- | :--- | :--- |
| **Page Background** | `#ffffff` | `#e60024` |
| **Pin / Wordmark** | `#e60024` | `#ffffff` |
| **Inputs** | Crimson on White | White on Crimson |
| **Button** | `#0a0a0a` | `#0a0a0a` |

- Applied to `<html data-pin-theme="...">` and cached in `localStorage`.
- Zero-flash execution: an inline script in `app/layout.tsx` determines and injects the active theme before first paint.
- Tab favicons (`<link rel="icon">`) and `<meta name="theme-color">` dynamically update on theme changes.

### 6. Supabase & Database Security

- The `public.waitlist` table enforces Row-Level Security (RLS) with **no public policies** and **zero table grants**. Direct REST queries return `42501 permission denied`.
- Data is processed exclusively through `public.join_waitlist(email, handle, ip, user_agent)`, a PostgreSQL `SECURITY DEFINER` function with pinned `search_path`.
- Implements email normalization, rate-limiting (max 5 signups per IP per 10 minutes), and idempotent conflict resolution.
- Graceful offline fallback: if `SUPABASE_URL` is omitted, requests are logged locally and return mock success to prevent blocking local development or preview environments.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Animation**: [Motion v13](https://motion.dev/)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS Design System with CSS Custom Properties
- **Audio**: Web Audio API (Karplus-Strong Algorithm)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + PostgREST)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚢 Deployment

The project is zero-config ready for Vercel:

```bash
npx vercel --prod
```

Configure your environment variables in **Project Settings -> Environment Variables**:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

---

## 📄 License

MIT © [Rachit](https://github.com/Rachit315)
