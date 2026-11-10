# Aduke Radio Blog

Next.js App Router, React, TypeScript and Tailwind. The original navy/coral homepage layout is retained.

## Local development

```sh
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell use `npm.cmd` if execution policy blocks npm.
Visit `/admin` locally to create the owner password (12?200 characters). Write drafts, upload covers, preview privately, publish, edit, and unpublish. Account settings allow password changes and revoke older sessions.
Unsaved editor content is recovered from the current browser tab using session storage; it is not a substitute for saving drafts to the server. Sign-out clears this recovery copy.

## Configuration

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_RADIO_STREAM_URL`: verified public audio stream; leave blank until available.
- `NEXT_PUBLIC_SITE_URL`: final public site origin for metadata and sitemap.
- `ADUKE_DEMO_CONTENT`: defaults on in development, off in production; explicitly set `true` for preview-only sample stories. Sample headlines are not verified reporting.
- `ADUKE_DATA_DIR`: persistent directory for owner credentials, login limits, and posts; defaults to `data`.

Production builds hide sample articles from homepage, related stories and article routes unless explicitly enabled. Real posts retain the original card positions, styling and article layout. Missing photography uses labeled placeholders. Official contact details, social URLs and radio stream still need to be supplied.

## Checks

```sh
npm run typecheck
npm run build
npm run verify:publishing
npm run verify:cloud
npm run verify:production
```

The publishing check starts its own production server on port 3017 with an isolated temporary account and data directory. It creates and removes one exact upload in `public/uploads`; it never changes the real owner account. It checks draft privacy, authenticated publishing, upload validation, persistence, URL redirects, metadata and password rotation.
Do not run development and production builds concurrently in the same `.next` directory.

## Backups and hosting

Without Supabase, use one Node.js process with a persistent filesystem. A serverless adapter is included for Supabase Postgres and private Storage; see [DEPLOYMENT.md](DEPLOYMENT.md). Its compare-and-swap logic is tested with a mock transport; live cloud verification still requires your Supabase project.
Both the directory selected by `ADUKE_DATA_DIR` and `public/uploads` must persist between deployments. Uploads must remain available to the Next.js server. GitHub does not contain articles, credentials, uploads or backups.

Stop the server before taking a consistent backup:

```sh
npm run backup
```

Backups are written to `backups/<timestamp>-<pid>/`. Store an additional private copy off this computer; the owner file contains password hashes and session-signing material. To restore while the server is stopped, copy the backup's `data` contents into `ADUKE_DATA_DIR` (or `data`) and `uploads` into `public/uploads`, then restart. Test restoration separately before public launch.

Before deployment: configure the Supabase project or choose persistent-disk hosting, configure HTTPS and the public origin, create the owner account through a controlled local setup, verify backups, supply approved images and real content, and run browser checks at desktop/tablet/mobile sizes.

## Implemented improvements

- Direct article links use stable slugs instead of title matching.
- Category/search state lives in the URL and follows browser history.
- Published dates replace invented relative trending dates.
- Dark theme persists across homepage and reading pages.
- Renamed published slugs redirect permanently and cannot be reused by another post.
- JSON request sizes are enforced while reading the actual body.
- Login limits persist across restarts; a shared newsroom throttle applies to sign-in and activation requests.
- Published images use Next.js optimisation.
- Sitemap, robots rules and article structured data support search engines.

The backup command is for local files only. For Supabase, export/back up the database and private Storage bucket separately; do not treat a local backup as a cloud backup.

The homepage geometry, brand palette, logo and section order are preserved. Visual browser QA remains required; code/build checks alone do not verify screenshot fidelity.

## Owner workflow

See [OWNER-GUIDE.md](OWNER-GUIDE.md) for step-by-step publishing instructions. The dashboard includes a readiness checklist, live word count, saved-story duplication, and recoverable archiving. Archived posts remain private until restored to drafts and published again.

The owner article editor now uses Tiptap for headings, subheadings, bold/italic/underline/strike, alignment, lists, quotes, safe links, inline uploaded images, and undo/redo. Rich documents are stored as validated JSON with `bodyFormat: rich-v1` and rendered as React elements; existing plain-text posts remain compatible. Run `npm run verify:rich-text` for formatting validation and compatibility checks.

## October 2026 editorial refresh

The local launch library now contains 21 published posts: 15 user-supplied stories and six original, source-attributed research briefs. `content/researched-2026-10-21.json` preserves the reviewed manuscripts and sources. `scripts/import-researched-launch.mjs` imports them locally (skipping existing slugs) and normalises the original launch headlines/excerpts. It intentionally refuses cloud mode; live migration remains a separate step. The six new covers use a credited Creative Commons archive portrait and original editorial illustrations; see `content/IMAGE-CREDITS.md` and `/credits`. No general copyright-free claim applies to the first fifteen supplied images.

The homepage initially displays nine cards, with More stories and a shareable `?view=all` archive. Sample cards are suppressed whenever real published posts are present. The same original layout and brand colours are retained, with revised headline spacing and real artist/featured/trending selections.

After building, run `node scripts/verify-launch-content.mjs` to check the real local 21-post library, source links, cover routes, optimisation and attribution. This check is read-only but requires the local launch content; use the other verification scripts for isolated tests.


## Team accounts and Artist Spotlight
The owner signs in at `/admin` using username `owner` and the existing password. The owner can invite Editors (publishing access) or Authors (own unpublished drafts only) through private one-use setup links in Team access, change roles and disable accounts. Account secrets and invitation hashes use the configured private newsroom storage. Owner email recovery is implemented through Resend but requires deployment configuration. Team password resets are issued privately by the owner through Team access. See `OWNER-GUIDE.md` for the full workflow.

Choose **Publishing > Homepage placement > Artist Spotlight** for a Music article with a cover photograph. Publishing replaces the previous main feature. Use `npm run verify:team` for isolated role, invitation, revocation and spotlight integration checks.
