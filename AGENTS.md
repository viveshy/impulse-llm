<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Impulse (web)

An AI model & provider explorer - "the single reference for every AI model." Fast,
keyboard-first, developer-grade. This repo is the **frontend**; it reads a read-only HTTP
API (`impulse-api`, whose `sync/` builds the catalog it serves).

## Design philosophy (non-negotiable)

MUST NOT look AI-generated. Restraint over decoration: **Linear** (density, list/detail,
⌘K), **Anthropic** (calm, typography), **Vercel** (dev-tool, status), **Stripe**
(data/pricing), **Raycast** (search), **Hugging Face** (top-nav, centered max-width content).
Typography over decoration; hierarchy over color; spacing over effects; borders intentional;
shadows rare. **Color communicates meaning only - the UI must stay legible with every accent
removed.** Dark-mode first. Motion 150-220ms, subtle.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (tokens live in
`src/app/globals.css` `@theme` - there is no `tailwind.config`) · TanStack Query · cmdk ·
framer-motion · lucide-react · zod. Font: Space Grotesk (local, `next/font`, tabular numerals).

## Architecture

- `src/lib/domain/` - types, Zod schemas, capability catalog (source of truth for shape).
- `src/lib/data/` - `DataSource` interface + `HttpDataSource` (the only implementation;
  reads `impulse-api`). `getDataSource()` is the single accessor - **no seed fallback**: if
  the API is unreachable, requests fail loudly rather than serving stale data. Configure the
  backend with `IMPULSE_API_URL` (defaults to `http://localhost:8080`). **No component
  imports data directly.**
- `src/app/api/*` - same-origin route handlers that call `getDataSource()` server-side. The
  browser's React Query hooks (`src/lib/query/`) fetch these, so the backend URL and
  full-catalog paging never reach the client. In-memory query logic lives in
  `src/lib/data/query.ts` (filter/sort/facets), shared by every consumer.
- `src/components/` - `layout/` (AppShell, TopNav, Topbar, CommandMenu), `common/`,
  `models/`, `providers/`, `pricing/`, `api/`.
- Nav: a Hugging-Face-style **two-row top bar** (`TopNav` = global nav + ⌘K search;
  `Topbar` = per-page title/search/filters). No sidebar. App content is centered in a
  `max-w-[1536px]` column so it never hugs the left on wide screens.
- Routes: `/` is the public marketing front door (its own top nav, same links). The `app/`
  segment wraps the shell around everything else: `/app/models`, `/app/models/[id]`,
  `/app/providers`, `/app/providers/[id]`, `/app/capabilities`, `/app/pricing`,
  `/app/compare`, `/app/api-explorer`, `/app/playground`, `/app/settings` (`/app` redirects
  to `/app/models`).

## Commands

`npm run dev` · `npm run build` (type-check + lint; **needs the API reachable** - pages
prerender against it) · `npm run lint`. Playwright is a devDep for screenshot verification.

## Conventions

- Commit messages: **never** add a "Co-Authored-By" / AI-attribution trailer.
- Numbers use tabular figures; format via `src/lib/utils/format.ts`.
- Status/semantic color only with an icon or label, never color alone.
- Models/providers are addressed by opaque **GUID** (from the API), never internal slugs.
