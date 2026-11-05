# KirinSounds hosted CMS

This Vinext/Cloudflare Worker source upgrades the existing Sites portfolio without changing its project ID. The source manifest keeps `appgprj_6aec071b14108191a546109fda3df79e`, uses `DB` for D1 and `BUCKET` for R2, and has no static-only deployment field. Preserve the existing public audience when the owner publishes this migration.

## Frontend and API

`public/` is the current Scope frontend. Its HTML, JavaScript, CSS, and media stay intact. The Worker routes `/` to `public/index.html`; assets are served by Cloudflare's `ASSETS` binding. `/api/*` and `/uploads/*` run through `server/cms.ts`. The maintained Vinext handler and Sites/connector integrations remain in place. Catch-all API routes use the same handler in development.

This is the canonical checkout for both the local Node edition and hosted Site. Edit frontend source only in `public/`; `dist/` is generated Vinext deployment output and must never be copied back into `public/`. The staging-only synchronization script has been removed.

`data/seed-content.json` contains the initial public content. Both backends use the same `server/validation.mjs`, so supported fields and media checks remain aligned. The local Node edition stores its password database, saved content, uploads, and subscribers in `.data/`; the hosted edition uses D1/R2. Runtime records are separate and never copied into the public frontend or a release archive.

`npm start` runs the dependency-free local Node server. Hosted development/builds use the Vinext scripts and require the development dependencies; `npm run start:hosted` previews the built Worker. Changing these scripts does not transfer local runtime data to the hosted Site.

## Authentication

Configure only `ADMIN_EMAIL` using the native Sites runtime environment tool with the verified Site owner's email. Never put its value in source or the hosting manifest. No separate hosted password, default password, OAuth flow, or API login implementation exists. Both Sites identity headers must be present and the email must match the configured administrator. `root` is the display name for that administrator, not a new account.

The frontend must open the returned `loginUrl` as a normal top-level anchor with `target="_top"`, never fetch it. On hosted logout, follow the returned `logoutUrl` as a top-level link; posting `/api/auth/logout` only revokes this CMS's CSRF token, and Sites dispatch owns actual sign-out. All admin writes also require an exact same-origin Origin, HttpOnly CSRF cookie, and the token returned by `/api/auth/status` in `X-CSRF-Token`. CSRF hashes and expiry are stored in D1 and bound to the Sites user ID; no additional secret is required.

The maintained portable Sites dev plugin strips spoofed identity headers and optionally supplies its documented local test identity. `npm run start:hosted` is a built Worker preview and does not simulate Sites sign-in. Do not expose that local preview directly as an authenticated production endpoint: production must remain behind Sites dispatch.

## Storage and migrations

`db/schema.ts` defines portfolio JSON with compare-and-swap revision, subscribers with a unique normalized email, expiring CSRF tokens, and a bounded subscription-rate bucket. The generated `drizzle/` SQL and metadata must be committed unchanged once applied. No request creates or alters a table.

The initial schema-only migration is `drizzle/0000_woozy_jazinda.sql`, with its generated Drizzle snapshot and journal. It has been generated and inspected. For later schema changes, append a migration before rebuilding:

```powershell
npm run db:generate
node C:/Users/hengl/.codex/plugins/cache/openai-curated-remote/sites/1.1.3/scripts/build-site.mjs
```

Apply each pending migration once to local preview only, using its actual generated filename:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_woozy_jazinda.sql
```

Sites applies the schema migrations to hosted D1 before deployment. The first content request inserts the validated application seed only if no portfolio content exists. Later deployments never reset saved edits. R2 files use generated UUID names, a 25 MiB limit, a MIME allowlist and signature checks; they support byte-range playback from `/uploads/`.

Subscriptions persist and deduplicate in D1. Admin listing, safe CSV export, and deletion are available. This is an email-list collection feature, not automatic newsletter delivery.

The integration check runs the actual API adapter against the generated migration using SQLite and an in-memory R2 fixture. Its fake identity is strictly a test harness, not a login mechanism:

```powershell
node tests/cms.integration.mjs
node node_modules/typescript/bin/tsc --noEmit
```

## Publication handoff

Use the Sites source helper from this canonical checkout to synchronize the existing source repository and package the built Worker and migrations, preserving the original project identity. Publish with the existing Site's public deployment tools. Keep the generated `dist/server/wrangler.json` and `dist/.openai` metadata intact. No new Site is required.

Exclude `node_modules`, `.sites-runtime`, `.wrangler`, `.env*`, `.dev.vars*`, build caches, deployment credentials, real subscriber lists, local `.data`, and private originals from any downloadable source ZIP. The published deployment archive is built by the Sites helper rather than manually assembled.
