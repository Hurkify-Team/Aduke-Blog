# Vercel + Supabase setup

The code is prepared; no cloud resources have been created or deployed.

1. Create a Supabase project. Run `supabase/setup.sql` in its SQL editor. This creates a private single-row newsroom state table, service-role-only RPC functions, and the private `aduke-uploads` bucket.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for local setup. Keep the service role key server-only; never commit it or prefix it with `NEXT_PUBLIC_`. Optionally set `SUPABASE_UPLOAD_BUCKET` if using a different configured bucket.
3. Start the project locally and create the owner account at `/admin`. This writes the owner account to the configured cloud database. Public-domain account setup remains disabled. If an account already exists, sign in with that account instead.
4. Test the complete publishing flow locally with cloud configuration: draft, image upload, private preview, publish, open the image and article, edit, sign out, sign in. Confirm the database and bucket contain the expected data. Do not point the isolated publishing verification script at a real account; it intentionally uses local test storage.
5. Import the GitHub repository into Vercel using the Next.js preset. Add the same server-only Supabase values to the intended Vercel environment. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin and `ADUKE_DEMO_CONTENT=false`. Set the verified radio audio URL only when available. Rebuild after changing public environment values.
6. Verify deployment persistence, image optimisation, owner login, draft privacy, sitemap, robots and password change. Configure private database and Storage backups and test restoration. No automatic cloud backup is implemented by this repository.

Do not expose the service role key in browser settings or public client code. The Supabase table and RPC functions have no anonymous/authenticated access grants. Public readers receive published post fields through the server; uploads are served through the application's validated `/uploads/<uuid>.<extension>` route. Uploaded files are public article media; do not upload confidential files.

The cloud adapter stores this small single-owner newsroom as versioned JSON state in Postgres. Conflicting transactions retry against the latest version; individual article edits also enforce an `updatedAt` check. A high-volume newsroom should migrate to normalised post/revision tables. This adapter has not been validated against a live Supabase project yet.

Upload limit: 3 MB per image with a 4 MB total multipart limit. Originals are stored in the private bucket, with Next.js providing optimised public article images.

## Existing local content

Enabling Supabase switches the source of truth. It does not silently upload local credentials, articles or photos. Existing local content needs an explicit migration and verification before switching the public deployment. Preserve local backups first.

## Remaining product work

- Supply approved photography, real stories, official contact/social details and a radio stream.
- Finish About/Advertise/Contact pages with verified business information.
- Browser visual QA against the original desktop and mobile design; no connected browser was available during implementation.
- Pagination, article revisions and richer media management are future enhancements. Recoverable archival is implemented.
- Email-based password recovery is not implemented; use the dashboard password change while signed in and retain secure account recovery procedures.


## Migrate the existing local newsroom
After running the SQL and saving the Supabase server settings privately in `.env.local`, run `node scripts/migrate-to-supabase.mjs` for a read-only check. Then run `node scripts/migrate-to-supabase.mjs --apply`. The migration refuses to replace a nonempty cloud newsroom, backs up local data and uploads, verifies uploaded bytes, and commits posts, categories and the existing owner account using a version check. Local originals are retained. The migrated admin uses your existing password.

Vercel settings: import Hurkify-Team/Aduke-Blog, framework Next.js, root `./`, default build/output settings. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_UPLOAD_BUCKET=aduke-uploads`, `GEMINI_API_KEY`, `GEMINI_IMPORT_MODEL`, and `ADUKE_DEMO_CONTENT=false` in the intended deployment environment. Keep server keys private. Set `NEXT_PUBLIC_SITE_URL` to the final public HTTPS origin when known; when absent, the app falls back to Vercel's production domain. Do not copy the local `http://localhost:3000` value into Vercel. Leave the radio stream unset until available.
