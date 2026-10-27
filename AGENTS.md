<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Impulse (web)

The frontier model desk: what OpenAI, Anthropic, Google and xAI ship, what each model costs
on every host, what is about to be retired, and the cheaper ways to get the same job done.
Open-weight and other labs are covered too, but frontier models come first everywhere. This
repo is the **frontend**; it reads a read-only HTTP API (`impulse-api`, whose `sync/` builds
the catalog it serves).

## Design philosophy (non-negotiable)

MUST NOT look AI-generated. Restraint over decoration: Linear (density, ⌘K), Stripe
(data/pricing), Vercel (dev-tool calm), Hugging Face (top nav, centered content).
Typography over decoration; hierarchy over color; spacing over effects; borders intentional;
shadows rare. **Color communicates meaning only** (status always with an icon or a label).
**Light-first**: light is the default theme, dark is opt-in from the header toggle
(light → dark → system, stored in `localStorage["impulse-theme"]`). Every text token
meets 4.5:1 on every surface in both themes. Charts use the `--chart` tokens, which are
validated with the dataviz palette checker.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (tokens live in
`src/app/globals.css` and `@theme inline`; there is no `tailwind.config`) · cmdk ·
lucide-react · Vitest. Font: Space Grotesk (local, `next/font`). No client data library:
pages are server components with ISR, and the few client islands fetch same-origin routes.

## Architecture

- `src/lib/domain/` - API-facing types and the capability labels.
- `src/lib/data/` - `DataSource` interface + `HttpDataSource` (the only implementation;
  reads `impulse-api` at `IMPULSE_API_URL`, default `http://localhost:8080`). The catalog
  is read with `node:http` outside Next's fetch cache (it is several MB) and kept in memory
  for 5 minutes; `getCatalogIndex()` (`catalog-index.ts`) memoises the built index per
  catalog load. **No seed fallback**: if the API is down, pages fail loudly.
- `src/lib/catalog/` - turns API rows into the canonical index. A **model** is one
  `CanonicalModel` (`/models/<lab>/<model>`) with every host's **listing** of it folded in;
  `reference` is the headline listing (the lab's own API where possible). Modules: `group`
  (index building), `labs`, `hosts`, `keys`, `names`, `lineage` (successors, current/retired),
  `select` (release radar, lineups, retirements, the models table), `alternatives`,
  `changes` (price moves), `cost`, `detail`, `directory` (labs and hosts pages),
  `notices` (retirement dates checked against the hosts' own notices), `watch` and
  `watch-feeds` (the watchlist page and its ICS and RSS feeds), `clouds` (the clouds pages),
  `calculator` (rows for the cost calculator), `capability-view`, `quickstart`.
- `src/lib/` also holds browser-safe helpers: `routes` (every URL is built here),
  `model-filters`, `compare`, `calculator`, `search` (⌘K ranking), `watchlist` (the `w`
  parameter), `clouds` (the covered clouds and region zones), `brands` (logo files), `utils/`.
- `src/components/` - `site/` (header, footer, logo, theme toggle, visitor beacon),
  `layout/` (⌘K menu), `ui/` (badges, prices, tiles, chips, tabs), and one folder per page:
  `home/`, `models/`, `detail/`, `compare/`, `calculator/`, `stats/`, `watchlist/`, `clouds/`.
  The logo's shapes are drawn twice, in `site/Logo.tsx` and `src/app/icon.svg` (the favicon);
  a test fails if they differ.
- Routes: `/`, `/models` (filters in the URL), `/models/[lab]/[model]`, `/releases`
  (+ `/releases/feed.xml`), `/retiring`, `/watchlist?w=...` (+ `/watchlist/calendar.ics`,
  `/watchlist/feed.xml`), `/compare?m=lab/model,...`, `/calculator`, `/labs`, `/labs/[lab]`,
  `/clouds`, `/clouds/[cloud]?zone=...`, `/hosts`, `/hosts/[host]`, `/stats`.
  Route handlers: `/api/search-index` (⌘K data), `/api/v` (visitor beacon). Old `/app/*`
  links redirect: static ones in `next.config.ts`, model and provider ids through
  `src/app/app/*/[id]/route.ts`.

## Visitor counting

`Beacon` posts the path (and the referrer on the first view) to `/api/v` on every route
change, unless the browser sends Do Not Track or Global Privacy Control. The route forwards
it to the API with the visitor's IP (`X-Real-IP` from nginx) and user agent; the API stores
only a daily-salted hash, drops bots and headless browsers, and serves `/stats`.

## Commands

`npm run dev` · `npm test` (Vitest) · `npm run lint` · `npm run build` (**needs the API
reachable**: ISR pages prerender against it). Playwright is a devDep for screenshot checks.

## Conventions

- Commit messages: **never** add a "Co-Authored-By" / AI-attribution trailer.
- Numbers use tabular figures in tables; format via `src/lib/utils/format.ts`.
- Missing values show as "-". UI copy avoids em dashes.
- Models are addressed by canonical, human-readable slugs (`/models/anthropic/claude-opus-5-5`);
  a wrong lab segment 308-redirects to the right one.
- Status/semantic color only with an icon or label, never color alone.
