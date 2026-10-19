# Aduke Radio Blog

Responsive homepage built with Next.js App Router, React, TypeScript, Tailwind CSS and Lucide icons.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

```sh
npm run typecheck
npm run build
npm start
```

## Reference and assets

The supplied homepage reference determines the desktop section order, sizing, colors, headline breaks, grids, sidebar and editorial tiles. The supplied logo is used unchanged on a white backing because its navy lettering differs from the reference's white lettering.

Original photography was not supplied separately. All photo positions are explicitly labeled placeholders; no screenshot crops or substitute celebrity photographs are used. Replace the placeholder component and hero artwork with approved images using `next/image` once assets are available. The visual result cannot match the reference photography until then.

Headlines and timestamps are demonstration content, not verified reporting. Article buttons open labeled demonstration previews. Category filters, search, ticker arrows, mobile menu and persistent theme toggle work locally. Utility links show informational previews. Social icons are display-only pending official profile URLs.

Copy `.env.example` to `.env.local` and configure `NEXT_PUBLIC_RADIO_STREAM_URL` with a verified audio endpoint to enable radio playback. Without it, the player explicitly states that the stream is unavailable. No CMS, database, additional pages or external publication is included.

Set `NEXT_PUBLIC_SITE_URL` to the final public origin before deployment so Open Graph image URLs resolve to the correct host.

## Structure

- `src/app`: page entry, metadata, responsive styles
- `src/components/Homepage.tsx`: reusable page components and interactions
- `src/data/homepage.ts`: typed demonstration content
- `public/images/logo.png`: unchanged approved logo

Browser screenshot comparison must be completed in an environment with a connected browser. Compare desktop at 1279 × 1169 and check mobile at 390 pixels wide; the mobile layout is an adaptation of the desktop reference.

Validation completed: `npm run typecheck` and `npm run build` passed. The production server returned HTTP 200 for the homepage and supplied logo; rendered HTML included the hero, Latest Stories, and unavailable-stream state. Browser interaction, overflow and screenshot comparison remain unverified because no browser connection was available. Port 3000 was occupied during verification; use `npm run dev -- --port 3007` if needed.
