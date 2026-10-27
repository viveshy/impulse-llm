# Impulse rework: the frontier model desk

Date: 2026-10-26. Owner: viveshy. Design calls below are mine (the owner said "think yourself the
creative approach and work on it"); the brief items in quotes are the owner's.

## Why

impulse.viveshy.com lists 4,306 LiteLLM listings from 125 hosts. The owner's complaints:

- "too dark theme. not properly visible on the eye. enhance the ux"
- "the latest released models is not working properly": `/` is prerendered at build time and frozen;
  each model appears once per host (Claude Opus 5.5 has 21 rows); only 193 of 506 frontier rows
  carry a release date, so "newest" sorting is noise.
- "alternate and cheaper models is not working properly": alternatives rank by similarity, so the
  top "alternatives" to Claude Opus 5.5 are Claude Opus 5.5 on Bedrock and Vertex, and nothing
  requires them to be cheaper.
- "see how detailed info hugging face and other tools provide": model pages are thin.
- "our focus should be on frontier ai models instead of open weights models": popularity comes
  from Hugging Face downloads, so open-weight models win every default sort.
- "add a traffic visitor for the website"
- "introduce some features which are need of the hour"

## Product

**Impulse is the frontier model desk: every frontier model, priced, compared and tracked.** A
developer or buyer comes to answer: what just shipped, what does it cost, where can I run it,
what's cheaper, and what is about to be retired.

### Goals

1. One page per *model*, not per listing. Listings from every host fold into a canonical model
   (`/models/anthropic/claude-opus-5-5`), with a "where to run" table across hosts and regions.
2. Frontier labs first. Frontier tier = OpenAI, Anthropic, Google, xAI. Open-weight labs (Meta,
   Mistral, DeepSeek, Alibaba/Qwen, Moonshot, Zhipu, MiniMax, OpenAI's gpt-oss…) stay available
   but are never the default.
3. Fresh. Catalog pages revalidate every 5 minutes (ISR) instead of freezing at build time.
4. Light, legible UI by default (WCAG AA text contrast), dark mode as an option.
5. Timely features: release radar + RSS, retirement tracker with successors, workload cost
   calculator, price changes, compare.
6. A privacy-friendly visitor counter (no cookies, daily-rotating salted hashes), shown in the
   footer and on a public `/stats` page.

### Non-goals

- No changes to the sync or the catalog schema this round. Everything new is derived from data
  the sync already stores (`models`, `model_raw.model_spec`, `model_price_history`, `meta`).
- No live playground (the old one was simulated; it's removed), no accounts, no paid features.
- No third-party analytics or trackers.

### Anti-goals (would make this a failure even if it works)

- A model page that recommends the same model on another host as an "alternative", or an
  "alternative" that is more expensive.
- Text that fails AA contrast, or tiny all-caps labels as the main hierarchy.
- An AI-generic look: gradients, glows, emoji, glassmorphism.
- Counting the owner's own screenshot bots or crawlers as visitors.

## Data model (web, derived)

- **Listing** = one API model row (GUID), interpreted: host, host kind (first-party, cloud,
  inference, gateway, subscription, local), the model id to call, region, deployment, snapshot
  date, fast-mode or fine-tune flags, prices.
- **Canonical model** = listings grouped by a normalized key. Normalization: lowercase; last path
  segment; strip `ft:`, `@…`, Bedrock region (`us.`, `eu.`, `apac.`, `au.`, `jp.`, `global.`,
  `us-gov.`) and vendor (`anthropic.`…) prefixes, `-vN:M` suffixes, `-latest`, date stamps
  (`YYYYMMDD`, `YYYY-MM-DD`, `MM-YYYY`, valid `MMDD` tokens); dots and underscores to dashes;
  `gpt-35` → `gpt-3-5`; old Claude 4+ word order (`claude-4-sonnet` → `claude-sonnet-4`); Claude
  `-fast` folds into the base as a fast-mode listing.
- **Lab** from a registry of name patterns and vendor prefixes (~20 labs).
- **Reference listing** = the lab's own API, global, current alias; it sets the headline price.
- **Release date** = earliest listing date or snapshot date. **Popularity** = number of distinct
  paid hosts.
- **Lineage**: a model's *line* is its key without version numbers (`claude-opus-5-5` → line
  `claude-opus`, version 5.5); the successor is the highest newer version in the same line and
  lab. *Current* = no successor and not retired.
- **Blended price** = (3 × input + output) / 4 per 1M tokens.

## API additions (impulse-api, read-only catalog)

- Every model DTO gains `route`, `litellmProvider`, `deprecationDate`, `sourceUrl`, `features`,
  `reasoningEfforts`, `rateLimits`, and pricing tiers (batch, cache write 5m/1h, flex, priority,
  long-context threshold, web search per query, regional uplift), parsed from `model_raw`.
- `GET /v1/models/{guid}` also returns the verbatim `spec`.
- Internal-only `GET /v1/price-changes?days=30`.
- Analytics in a **separate** SQLite file (`IMPULSE_ANALYTICS_DB`, prod
  `/var/lib/impulse/analytics.db` via systemd `StateDirectory=impulse`); the catalog stays
  read-only. Internal-only `POST /v1/analytics/hit` and `GET /v1/analytics/summary?days=N`.
  Visitor id = first 16 hex of sha256(daily salt + ip + user agent); salts older than today are
  deleted, so ids can't be linked across days. Bots (UA pattern) are not counted. Fails soft.

## Site map

| Route | Purpose |
|---|---|
| `/` | Hero + search, release radar, frontier lineup, retiring soon, price changes, open-weight releases |
| `/models` | Canonical model table; filters: tier (frontier default), lab, type, search, sort |
| `/models/[lab]/[model]` | Detail: key stats, pricing tiers + quick cost, where to run, capabilities, cheaper alternatives, lineage, benchmarks, quickstart, raw spec, sources |
| `/releases`, `/releases/feed.xml` | Release timeline by month, RSS |
| `/retiring` | Retirement tracker with days left, affected hosts, suggested successor |
| `/compare?m=lab/model,…` | Up to 4 models side by side + cost at one workload |
| `/calculator` | Monthly cost of a workload across models (presets, cache hit %, batch) |
| `/labs`, `/labs/[lab]` | Lab lineups |
| `/hosts`, `/hosts/[host]` | Host catalogues with price vs the lab's own |
| `/stats` | Visitors (30 days), top pages, referrers, catalog stats |

Old `/app/*` URLs redirect (a listing GUID resolves to its canonical model).

### Alternatives (fixed)

Four buckets, each strictly cheaper by blended price than the reference listing, each showing %
saving and capability coverage of the target's key capabilities (tools, vision, reasoning,
structured outputs, prompt caching) plus context:

1. Same model, cheaper host or region.
2. Same lab, smaller current model.
3. Other frontier labs, current models.
4. Open-weight budget picks (cheapest host shown).

Never the same canonical model in buckets 2–4; never deprecated or special-purpose models (search,
audio, realtime, image…) unless the target is that kind. If the target has no price, show "similar
models" without savings.

## Look and feel

- Light by default: warm white page, white panels, zinc ink scale (ink-3 ≥ 4.5:1 on white),
  indigo accent for links/focus/selection only. Dark theme tuned for contrast. Toggle in the header
  (light / dark / system), persisted in localStorage, applied before paint.
- Space Grotesk for UI, system monospace for model ids and code. Section labels in sentence case
  at readable sizes. Numbers in tabular figures.
- New logo: an "impulse spike" mark (a pulse line in a rounded square), also the favicon.
  Replaced on 2026-10-27 because it read as a heartbeat: see
  `2026-10-27-watchlist-and-clouds-design.md`.

## Constraints

- Stack stays: Next.js 16.4.2 + React 19.2.4 + Tailwind v4 (web), FastAPI + SQLite (API).
- The catalog DB stays read-only to the API (`mode=ro`).
- No commits, pushes or deploys without the owner's OK. Deploy must not run the sync.
- Tests: vitest for web domain logic, pytest for the API.

## Left to the builder

Exact copy, spacing, the set of presets in the calculator, the per-lab quickstart snippets, which
hosts get friendlier display names, and chart details on `/stats`.
