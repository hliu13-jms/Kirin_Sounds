# KirinSounds hosted CMS

This Vinext/Cloudflare Worker source upgrades the existing Sites portfolio without changing its project ID. The source manifest keeps `appgprj_6aec071b14108191a546109fda3df79e`, uses `DB` for D1 and `BUCKET` for R2, and has no static-only deployment field. Preserve the existing public audience when the owner publishes this migration.

## Frontend and API

`public/` is the current Scope frontend. Its HTML, JavaScript, CSS, and media stay intact. The Worker routes `/` to `public/index.html`; assets are served by Cloudflare's `ASSETS` binding. `/api/*` and `/uploads/*` run through `server/cms.ts`. The maintained Vinext handler and Sites/connector integrations remain in place. Catch-all API routes use the same handler in development.

This is the canonical checkout for both the local Node edition and hosted Site. Edit frontend source only in `public/`; `dist/` is generated Vinext deployment output and must never be copied back into `public/`. The staging-only synchronization script has been removed.

`data/seed-content.json` contains the initial public content. Both backends use the same `server/validation.mjs`, so supported fields and media checks remain aligned. The local Node edition stores its password database, saved content, uploads, and subscribers in `.data/`; the hosted edition uses D1/R2. Runtime records are separate and never copied into the public frontend or a release archive.

`npm start` runs the dependency-free local Node server. Hosted development/builds use the Vinext scripts and require the development dependencies; `npm run start:hosted` previews the built Worker. Changing these scripts does not transfer local runtime data to the hosted Site.

## Authentication

The owner explicitly chose a standalone password lock instead of ChatGPT sign-in. Open `https://kirinsounds.art/admin/`; there is no public homepage login button. The admin interface stays on the portfolio domain and sends authenticated API requests to the existing Worker. Platform sign-in helpers remain available to the underlying Sites integration but do not authorize CMS access.

Set the native runtime secret `ADMIN_PASSWORD_HASH` to `pbkdf2-sha256$100000$<32-byte salt as hex>$<32-byte verifier as hex>`. The raw password is never bundled or committed. A missing or invalid verifier disables login; there is no public initial-setup endpoint. Login attempts are rate limited. Successful login creates a random 256-bit bearer session whose hash is stored in D1, expires after four hours, and is revoked on logout. Changing the verifier also invalidates existing sessions.

The admin token lives only in the page's memory. Refreshing the page requires re-entering the password. Authenticated API calls use explicit bearer authorization, omit cookies, and restrict cross-origin callers to the canonical HTTPS portfolio origins. Writes additionally check Origin and the matching `X-CSRF-Token`. Public content and subscription calls carry no admin credentials. The local Node edition retains its separate scrypt/cookie login and local `.data` records.

## Storage and migrations

`db/schema.ts` defines portfolio JSON with compare-and-swap revision, subscribers with a unique normalized email, hashed expiring admin sessions, and login/subscription rate buckets. The historical CSRF table remains for migration compatibility. The generated `drizzle/` SQL and metadata must be committed unchanged once applied. No request creates or alters a table.

The initial schema-only migration is `drizzle/0000_woozy_jazinda.sql`, with its generated Drizzle snapshot and journal. It has been generated and inspected. For later schema changes, append a migration before rebuilding:

```powershell
npm run db:generate
node C:/Users/hengl/.codex/plugins/cache/openai-curated-remote/sites/1.1.3/scripts/build-site.mjs
```

Apply each pending migration once to local preview only, using its actual generated filename:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_woozy_jazinda.sql
```

Sites applies the schema migrations to hosted D1 before deployment. The first content request inserts the validated application seed only if no portfolio content exists. Later deployments never reset saved edits. R2 files use generated UUID names, a MIME allowlist and signature checks; they support byte-range playback from `/uploads/`.

Audio files support up to 1 GiB. Files above 25 MiB use 8 MiB R2 multipart uploads, so the Worker never buffers a whole large recording. Signed upload handles expire after two hours and are bound to the current authenticated session. Each part checks its exact expected length; the first part checks the media signature. Completion verifies the full part list and final object size. Part and completion retries are safe; failed uploads are aborted. Images, video and PDFs retain the 25 MiB limit. The Node edition streams uploads to temporary files and publishes only complete validated media. Uploaded files are linked to the public portfolio only when the owner saves the content.

Subscriptions persist and deduplicate in D1. Admin listing, safe CSV export, and deletion are available. This is an email-list collection feature, not automatic newsletter delivery.

The integration check runs the actual API adapter against all generated migrations using SQLite and an in-memory R2 fixture. It uses an isolated test password and no production account or records:

```powershell
node tests/cms.integration.mjs
node node_modules/typescript/bin/tsc --noEmit
```

## Publication handoff

Use the Sites source helper from this canonical checkout to synchronize the existing source repository and package the built Worker and migrations, preserving the original project identity. Publish with the existing Site's public deployment tools. Keep the generated `dist/server/wrangler.json` and `dist/.openai` metadata intact. No new Site is required.

Exclude `node_modules`, `.sites-runtime`, `.wrangler`, `.env*`, `.dev.vars*`, build caches, deployment credentials, real subscriber lists, local `.data`, and private originals from any downloadable source ZIP. The published deployment archive is built by the Sites helper rather than manually assembled.
