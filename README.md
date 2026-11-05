# Henglin Liu / KirinSounds麟

An interactive portfolio in sound, photography and creative technology. Connect a source module to the Scope, listen to compositions, explore photography and switch between English, Chinese and Japanese.

GitHub Pages publishes the static frontend from `public/` through `.github/workflows/pages.yml`.

- Pages: https://hliu13-jms.github.io/Kirin_Sounds/
- Custom domain: https://kirinsounds.art/
- Private studio: https://kirinsounds.art/admin/
- Persistent CMS and subscriptions: https://kirinsounds-portfolio.kirinsounds.chatgpt.site/

The Pages frontend reads public content and submits email subscriptions to the persistent backend. The private studio stays on `/admin/` and uses a server-verified password without ChatGPT sign-in or redirects. Its temporary bearer session is stored only in page memory, expires after four hours, and is revoked on logout. Administrator credentials and subscriber lists are never published in this repository. Uploaded media stays on the backend. A bundled public snapshot keeps portfolio browsing available if the API is unavailable.

## Run locally

Install Node.js 22.13 or newer, then run `node server.mjs`. Open the local address shown in the terminal. No npm installation is needed for local preview. Windows ZIP users must extract the entire archive before starting `Start-Portfolio.cmd`.

## Export Pages

Run `node scripts/build-pages.mjs`. Only the generated `.pages-output/` directory is published. The Actions workflow runs this command automatically after pushes to `main`.

See [README_PAGES.md](README_PAGES.md) for publishing, the external backend, custom domains and maintenance. [README.txt](README.txt) describes local root setup and persistent local data. [README_VPS.md](README_VPS.md) preserves the optional standalone server deployment.

## Content

Escaping is the final version. Current materials distinguish completed work from Max/gen~ learning. Foto uses the public `kirinvisions` profile rather than the signed-in app route.

Photos, recordings and portfolio content belong to their respective creators. Bundled font licenses are in `LICENSES/`.
