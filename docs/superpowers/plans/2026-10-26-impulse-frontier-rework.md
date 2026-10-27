# Impulse frontier rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn impulse into a light, frontier-first model desk: canonical model pages, working
release and cheaper-alternative views, timely tools (releases, retirements, calculator, compare),
and a privacy-friendly visitor counter.

**Architecture:** The API (FastAPI over the read-only SQLite catalog) exposes more of what the
sync already stores and gains a separate analytics SQLite. The web app (Next.js 16) folds
per-host listings into canonical models in a pure TypeScript layer (`src/lib/catalog/`), builds
that index server-side once per catalog load, and renders ISR pages (revalidate 300) from it.

**Tech Stack:** Next.js 16.4.2, React 19.2.4, Tailwind v4, TanStack Query, cmdk, vitest (new dev
dep); FastAPI, SQLite, pytest + httpx (new dev deps).

**Spec:** `docs/superpowers/specs/2026-10-26-impulse-frontier-rework-design.md`

Repos: web `~/Personal/Cruise/repos/impulse-llm`, API `~/Personal/Cruise/repos/impulse-api`.

## Global Constraints

- **Never commit, push or deploy.** Every task ends with "leave uncommitted". The owner approves
  commits and deploys separately. Never run the sync (`systemctl start impulse-sync`, `deploy.sh`).
- The catalog DB is opened read-only (`mode=ro`); only the analytics DB is written.
- No AI-attribution text anywhere (code comments, docs, commit messages).
- Web: read the relevant guide in `node_modules/next/dist/docs/` before using a Next API; params
  and searchParams are Promises; catalog pages use `export const revalidate = 300`.
- Prices are USD per 1M tokens. A listing is *priced* when input > 0 or output > 0; $0 means
  unlisted, not free. Blended = (3 × input + output) / 4.
- Frontier labs: `openai`, `anthropic`, `google`, `xai`. Subscription hosts (`GitHub Copilot`,
  `ChatGPT Subscription`, `Microsoft 365 Copilot`) never count as price options.
- Text tokens meet WCAG AA (≥ 4.5:1) in both themes. Light is the default theme.
- Numbers use tabular figures; status colour always comes with an icon or label.

## Review Focus

- A model with no priced listing (all $0): headline shows "Price not listed", alternatives fall
  back to "similar models" without savings, calculator skips it. Test in Task W3/W4.
- A canonical model whose listings span several modes (Perplexity lists Claude as `responses`):
  kind comes from the reference listing; it still groups. Test in Task W2.
- Listing names with odd shapes (`ft:gpt-4o-2024-08-06`, `anthropic.claude-v2:1`,
  `claude-3-5-sonnet@20240620`, `gpt-oss:120b-cloud`, `accounts/fireworks/models/llama-v3p1-8b`)
  must not crash or collapse to an empty key. Test in Task W1.
- Analytics endpoint hit with garbage (missing fields, 5 KB path, bot UA, non-internal client):
  returns 404 for public clients, `{"counted": false}` for junk, never 500. Test in Task A3.
- Unknown `/models/[lab]/[model]` or a lab segment that doesn't match the model: 404 for
  unknown, redirect to the right lab for a mismatch. Test in Task W5 (route helper).

---

## API tasks (impulse-api)

### Task A1: Test harness and listing extras

**Files:**
- Modify: `pyproject.toml` (add `[dependency-groups] dev = ["pytest>=8", "httpx>=0.27"]`)
- Create: `app/utils/listing.py`, `tests/conftest.py`, `tests/test_listing.py`, `tests/test_models_api.py`
- Modify: `app/dao/models.py` (`_SUMMARY`), `app/handlers/models.py` (`_summary`, `get_model`)

**Interfaces:**
- Produces `route_of(internal_id: str, name: str, provider_slug: str, litellm_provider: str) -> str | None`:
  removes `slugify(name)` from the end of `internal_id`, then repeatedly strips a leading
  `<p>-`/`<p>_` for p in {provider_slug, slugify(provider_slug), litellm_provider,
  slugify(litellm_provider)} (longest first); returns the remainder or None when empty.
- Produces `spec_extras(spec: dict) -> dict` with keys `deprecationDate`, `sourceUrl`,
  `features` (sorted list), `reasoningEfforts` (ordered subset of
  `["none","minimal","low","medium","high","xhigh","max"]` from `supports_<x>_reasoning_effort`
  true flags plus `reasoning_effort_levels`), `rateLimits` (`{"rpm","tpm"}` or None), and
  `pricing` = `{cacheWritePerMtok, cacheWrite1hPerMtok, batchInputPerMtok, batchOutputPerMtok,
  flexInputPerMtok, flexOutputPerMtok, priorityInputPerMtok, priorityOutputPerMtok,
  longContext: {thresholdTokens, inputPerMtok, outputPerMtok} | None, webSearchPerQuery,
  regionalUplift}`. Per-token → per-Mtok is `round(v * 1e6, 6)`. Feature map:
  `supports_web_search→webSearch, supports_computer_use→computerUse, supports_pdf_input→pdfInput,
  supports_url_context→urlContext, supports_parallel_function_calling→parallelToolCalls,
  supports_audio_input→audioInput, supports_audio_output→audioOutput,
  supports_video_input→videoInput, supports_adaptive_thinking→adaptiveThinking,
  thinking_always_on→thinkingAlwaysOn, supports_assistant_prefill→assistantPrefill,
  supports_native_structured_output→nativeStructuredOutput, supports_tool_search→toolSearch,
  supports_fast_mode→fastMode, supports_prompt_caching→promptCaching`. `longContext` uses the
  smallest N among `input_cost_per_token_above_{N}k_tokens`. `webSearchPerQuery` takes
  `search_context_cost_per_query` medium, else low, else high, or a plain number.
  `regionalUplift` = `regional_processing_uplift_multiplier_us`, else
  `provider_specific_entry.us`, else None.
- The model summary DTO gains top-level `route`, `litellmProvider`, `deprecationDate`,
  `sourceUrl`, `features`, `reasoningEfforts`, `rateLimits`, and `pricing` gains the extras keys.
  `GET /v1/models/{guid}` also returns `spec` (the parsed dict). Internal ids stay unserialized.

- [ ] **Step 1: Write failing tests**

```python
def test_route_of_azure_region():
    assert route_of("azure-eu-gpt-6-sol", "gpt-6-sol", "azure", "azure") == "eu"
def test_route_of_bedrock_govcloud():
    assert route_of("bedrock-us-gov-east-1-anthropic-claude-opus-5-5",
                    "anthropic.claude-opus-5-5", "bedrock", "bedrock_converse") == "us-gov-east-1"
def test_route_of_first_party_is_none():
    assert route_of("claude-opus-5-5", "claude-opus-5-5", "anthropic", "anthropic") is None
def test_route_of_vertex_default_is_none():
    assert route_of("vertex-ai-claude-opus-5-5-default", "claude-opus-5-5@default",
                    "vertex_ai", "vertex_ai-anthropic_models") is None
def test_spec_extras_prices_and_flags():
    x = spec_extras({"input_cost_per_token_batches": 2e-06, "cache_creation_input_token_cost": 5e-06,
                     "cache_creation_input_token_cost_above_1hr": 8e-06,
                     "input_cost_per_token_above_272k_tokens": 4e-06,
                     "output_cost_per_token_above_272k_tokens": 1.5e-05,
                     "search_context_cost_per_query": {"search_context_size_low": 0.01, "search_context_size_medium": 0.02},
                     "supports_web_search": True, "supports_pdf_input": True, "supports_computer_use": False,
                     "supports_xhigh_reasoning_effort": True, "supports_none_reasoning_effort": True,
                     "deprecation_date": "2027-01-08", "source": "https://x", "rpm": 50})
    assert x["pricing"]["batchInputPerMtok"] == 2.0
    assert x["pricing"]["cacheWrite1hPerMtok"] == 8.0
    assert x["pricing"]["longContext"] == {"thresholdTokens": 272000, "inputPerMtok": 4.0, "outputPerMtok": 15.0}
    assert x["pricing"]["webSearchPerQuery"] == 0.02
    assert x["features"] == ["pdfInput", "webSearch"]
    assert x["reasoningEfforts"] == ["none", "xhigh"]
    assert x["deprecationDate"] == "2027-01-08" and x["sourceUrl"] == "https://x"
    assert x["rateLimits"] == {"rpm": 50, "tpm": None}
def test_spec_extras_empty():
    x = spec_extras({})
    assert x["features"] == [] and x["pricing"]["longContext"] is None and x["rateLimits"] is None
def test_model_detail_has_extras_and_spec(client, guids):
    r = client.get(f"/v1/models/{guids['opus_bedrock_gov']}").json()
    assert r["route"] == "us-gov-east-1" and r["spec"]["litellm_provider"] == "bedrock_converse"
    assert "id" not in r and "internal_id" not in r
def test_catalog_rows_have_extras(client):
    m = client.get("/v1/catalog").json()["models"][0]
    assert {"route", "features", "deprecationDate"} <= m.keys() and "batchInputPerMtok" in m["pricing"]
```

`tests/conftest.py` sets `IMPULSE_DB_PATH` and `IMPULSE_ANALYTICS_DB` to files under a
session temp dir **before importing `app`**, builds the catalog from `sync/db/schema.sql` plus
fixture rows (Anthropic `claude-opus-5-5` with a real-shaped spec, its Bedrock GovCloud listing
`bedrock-us-gov-east-1-anthropic-claude-opus-5-5`, Azure `azure-eu-gpt-6-sol`, and price-history
rows), and exposes `client` (FastAPI `TestClient`) and `guids` fixtures.

- [ ] **Step 2: Run** `uv run pytest -q` → the new tests FAIL (ImportError / KeyError).
- [ ] **Step 3: Implement** `app/utils/listing.py`; add `m.id AS internal_id, p.id AS provider_slug,
  rw.model_spec` (LEFT JOIN `model_raw rw`) to `_SUMMARY`; extend `_summary` and `get_model`.
- [ ] **Step 4: Run** `uv run pytest -q` → all PASS; `curl -s 127.0.0.1:8090/v1/meta` still 200.
- [ ] **Step 5: Leave uncommitted.**

### Task A2: Price changes endpoint

**Files:** Modify `app/dao/models.py`, `app/handlers/models.py`; create `app/routers/changes.py`;
modify `app/main.py`; test `tests/test_changes.py`.

**Interfaces:**
- Produces internal-only `GET /v1/price-changes?days=30` (1 ≤ days ≤ 90; 404 for non-internal
  clients, same check as `/v1/catalog`) returning
  `{"days": int, "changes": [{"guid", "name", "provider": {"guid","name"}, "route",
  "from": {"inputPerMtok","outputPerMtok"}, "to": {"inputPerMtok","outputPerMtok"}, "at"}]}`
  newest first, max 200. A change is a history row whose previous row (same model, by
  `recorded_at`) has a different input or output price; both rows inside the window; only active
  models (join `models`).

- [ ] **Step 1: Write failing tests** `test_price_changes_lists_real_change` (fixture model with
  rows 2.0→1.5 input returns one change with `from.inputPerMtok == 2.0`, `to.inputPerMtok == 1.5`),
  `test_price_changes_ignores_unchanged_rows`, `test_price_changes_hidden_from_public` (request
  with `X-Forwarded-For: 8.8.8.8` → 404).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with a `LAG()` window query.
- [ ] **Step 4: Run** `uv run pytest -q` → PASS. **Step 5: Leave uncommitted.**

### Task A3: Visitor analytics

**Files:** Create `app/analytics.py` (connection, schema, record, summary), `app/routers/analytics.py`,
`tests/test_analytics.py`; modify `app/settings.py` (`ANALYTICS_DB` from `IMPULSE_ANALYTICS_DB`,
default `<repo>/analytics.db`; `SITE_HOST` from `IMPULSE_SITE_HOST`, default
`impulse.viveshy.com`), `app/main.py`, `.gitignore` (`analytics.db*`).

**Interfaces:**
- Schema (created lazily, WAL): `hits(id INTEGER PRIMARY KEY, day TEXT, ts TEXT, path TEXT,
  visitor TEXT, ref_host TEXT)` with indexes on `day` and `(day, visitor)`;
  `salts(day TEXT PRIMARY KEY, salt TEXT)`.
- `record_hit(path: str, ip: str, ua: str, ref: str | None, now: datetime | None = None) -> bool`:
  False (not stored) for bot/empty UA, path not starting with `/`, `/api/` or `/_next/` paths,
  or any DB error. Path: drop `?…`/`#…`, cap 200 chars. Visitor = `sha256(salt+ip+ua)[:16]` with
  today's random salt (`secrets.token_hex(16)`); creating today's salt deletes older salts and
  hits older than 400 days. `ref_host` = referrer hostname unless it is `SITE_HOST`, `localhost`,
  `127.0.0.1` or empty.
- `summary(days: int, now: datetime | None = None) -> dict` returning `{"days", "generatedAt",
  "totals": {"views","visitors"}, "today": {"views","visitors"}, "allTime": {"views","since"},
  "daily": [{"day","views","visitors"}] (zero-filled, oldest first, len == days),
  "topPages": [{"path","views"}] (≤10), "topReferrers": [{"host","views"}] (≤10)}`; visitors =
  per-day distinct visitors summed. On DB error returns the same shape with zeros.
- Routes (internal-only, 404 otherwise): `POST /v1/analytics/hit` body
  `{"path": str, "ip": str, "ua": str, "ref": str | null}` (pydantic, each ≤ 2048 chars) →
  `{"counted": bool}`; `GET /v1/analytics/summary?days=30` (1..365).

- [ ] **Step 1: Write failing tests**: `test_hit_counts_once_per_visitor_per_day` (3 hits, same
  ip+ua → views 3, visitors 1), `test_bot_ua_not_counted` (`Googlebot`, `curl/8`,
  `HeadlessChrome` → counted False), `test_daily_is_zero_filled` (days=7 → 7 entries),
  `test_referrer_excludes_own_host`, `test_query_string_stripped`, `test_hit_public_client_404`,
  `test_hit_rejects_long_payload_without_500`, `test_old_salts_deleted_on_new_day` (record at
  day 1 then day 2 via `now=` → only one salt row).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `uv run pytest -q` → PASS.
- [ ] **Step 5:** update `README.md` (endpoints, `IMPULSE_ANALYTICS_DB`) and the FastAPI
  description in `app/main.py` ("frontier first"). **Leave uncommitted.**

---

## Web tasks (impulse-llm)

### Task W1: Catalog vocabulary — labs, hosts, name parsing, display names

**Files:** Modify `package.json` (devDeps `vitest`, script `"test": "vitest run"`); create
`vitest.config.ts` (alias `@` → `src`), `src/lib/catalog/{labs.ts,hosts.ts,keys.ts,names.ts}`,
tests `src/lib/catalog/__tests__/{keys,names,labs,hosts}.test.ts`.

**Interfaces:**
- `labs.ts`: `type LabId = string`; `interface Lab { id: LabId; name: string; tier: "frontier" |
  "open" | "other"; website: string }`; `LABS: Lab[]`; `labById(id): Lab | undefined`;
  `labFor(key: string, vendorHint?: string, hostName?: string): LabId | null` (vendor hint first,
  then key patterns, then the host's own lab for first-party hosts).
- `hosts.ts`: `type HostKind = "first-party" | "cloud" | "inference" | "gateway" | "subscription"
  | "local"`; `interface HostInfo { slug: string; name: string; kind: HostKind; labId?: LabId }`;
  `hostInfo(apiName: string, category: ProviderCategory): HostInfo` (registry by API name,
  fallback by category: frontier→first-party, open→first-party, inference→inference,
  cloud→cloud); `slug` = slugified display name.
- `keys.ts`: `interface ParsedName { key: string; snapshot?: string; region?: string;
  vendor?: string; fineTune: boolean; fast: boolean; alias: boolean }`;
  `parseListingName(name: string, opts?: { hostName?: string }): ParsedName` implementing the
  spec's normalization; `routeInfo(route: string | undefined, litellmProvider?: string):
  { region?: string; deployment?: string; commitment: boolean; variant?: string }`.
- `names.ts`: `displayName(key: string): string`.

- [ ] **Step 1: Write failing tests** (table-driven; each row is one assertion):

| input → key | extra |
|---|---|
| `claude-opus-5-5` → `claude-opus-5-5` | |
| `claude-opus-5.5` → `claude-opus-5-5` | |
| `us.anthropic.claude-opus-5-5` → `claude-opus-5-5` | region `us`, vendor `anthropic` |
| `us-gov.anthropic.claude-opus-5-5` → `claude-opus-5-5` | region `us-gov` |
| `claude-opus-5-5@default` → `claude-opus-5-5` | |
| `claude-3-5-sonnet@20240620` → `claude-3-5-sonnet` | snapshot `2024-06-20` |
| `anthropic.claude-3-5-sonnet-20241022-v2:0` → `claude-3-5-sonnet` | snapshot `2024-10-22` |
| `anthropic.claude-v2:1` → `claude-2-1` | |
| `claude-4-sonnet` → `claude-sonnet-4` | |
| `claude-3-5-sonnet-latest` → `claude-3-5-sonnet` | alias true |
| `claude-opus-5-5-fast` → `claude-opus-5-5` | fast true |
| `gpt-6.1-sol` → `gpt-6-1-sol` | |
| `gpt-4o-2024-08-06` → `gpt-4o` | snapshot `2024-08-06` |
| `ft:gpt-4o-2024-08-06` → `gpt-4o` | fineTune true |
| `gpt-35-turbo` → `gpt-3-5-turbo` | |
| `gpt-4-0613` → `gpt-4` | |
| `grok-4.20-0309-reasoning` → `grok-4-20-reasoning` | |
| `gemini-2.5-flash-preview-09-2025` → `gemini-2-5-flash-preview` | snapshot `2025-09` |
| `mistral-large-2407` → `mistral-large-2407` | (YYMM kept) |
| `databricks-claude-opus-5-5` (host Databricks) → `claude-opus-5-5` | |
| `accounts/fireworks/models/llama-v3p1-8b-instruct` (host Fireworks AI) → `llama-3-1-8b-instruct` | |
| `gpt-oss:120b-cloud` → `gpt-oss-120b-cloud` | |

  `displayName`: `claude-opus-5-5`→`Claude Opus 5.5`, `claude-3-5-sonnet`→`Claude 3.5 Sonnet`,
  `gpt-6-1-sol`→`GPT-6.1 Sol`, `gpt-4o-mini`→`GPT-4o Mini`, `o3-mini`→`o3-mini`,
  `gemini-3-8-flash`→`Gemini 3.8 Flash`, `grok-4-7`→`Grok 4.7`, `llama-3-1-8b-instruct`→
  `Llama 3.1 8B Instruct`, `dall-e-3`→`DALL·E 3`, `gpt-oss-120b`→`gpt-oss-120b`,
  `deepseek-v3-2`→`DeepSeek V3.2`.
  `labFor`: `claude-opus-5-5`→anthropic, `gpt-oss-120b`→openai, `text-embedding-004`→google,
  `text-embedding-3-large`→openai, `grok-4-7`→xai, `kimi-k3`→moonshot, `sonar-pro`→perplexity,
  `llama-3-1-8b`→meta, `x` with vendor `amazon`→amazon, unknown→null.
  `hostInfo`: `AWS - Bedrock`→{slug `amazon-bedrock`, kind cloud}; `GitHub Copilot`→subscription;
  `Google AI Studio - Gemini`→{name `Google AI Studio`, kind first-party, labId google};
  `Ollama`→local; unknown with category inference→inference.
  `routeInfo`: `eu`→region `eu`; `us-gov-east-1`→region `us-gov-east-1`;
  `us-east-1-1-month-commitment`→commitment true; `global-standard`→deployment `Global Standard`;
  `qwen` (vendor org)→{commitment false} with no region; `low-1024-x-1024`→variant `low · 1024×1024`;
  litellmProvider `bedrock_mantle`→deployment `Mantle`.
- [ ] **Step 2: Run** `npx vitest run src/lib/catalog` → FAIL (modules missing).
- [ ] **Step 3: Implement** the four modules.
- [ ] **Step 4: Run** → PASS. **Step 5: Leave uncommitted.**

### Task W2: Canonical index — grouping, reference listing, lineage

**Files:** Create `src/lib/catalog/{types.ts,group.ts,lineage.ts,select.ts}`, fixture
`src/lib/catalog/__fixtures__/sample.json` (real rows for the Opus 5.5, GPT-6 Sol, Gemini 4 Argon,
Grok 4.7, Claude 3.5 Sonnet, GPT-4o, Claude 2.1 and a few open-weight groups, exported from the
local API), tests `__tests__/{group,lineage,select}.test.ts`.
Modify `src/lib/domain/types.ts` (Model and Pricing gain the API extras as optional fields:
`route, litellmProvider, deprecationDate, sourceUrl, features, reasoningEfforts, rateLimits, spec`;
`cacheWritePerMTok, cacheWrite1hPerMTok, batchInputPerMTok, batchOutputPerMTok, flexInputPerMTok,
flexOutputPerMTok, priorityInputPerMTok, priorityOutputPerMTok, longContext, webSearchPerQuery,
regionalUplift`) and `src/lib/data/http-source.ts` (map them; keep `meta` from `/v1/catalog`).

**Interfaces:**
- `types.ts`: `ModelKind = "chat" | "image" | "video" | "speech" | "transcription" | "realtime" |
  "embedding" | "rerank" | "moderation" | "search" | "ocr" | "other"`; `Listing { id; hostId;
  host: HostInfo; apiModelId; key; snapshot?; region?; deployment?; variant?; fast; fineTune;
  commitment; mode; kind: ModelKind; status; deprecationDate?; releaseDate?; pricing: Pricing;
  priced: boolean; blended: number | null; contextWindow; maxOutputTokens; capabilities:
  CapabilityKey[]; features: string[]; reasoningEfforts: string[]; modalities; description;
  openWeights: boolean; license?; sourceUrl? }`; `CanonicalModel { slug; labId: LabId | null;
  labSlug: string ("other" when null); labName; name; line; version: number[]; tier: "frontier" |
  "open" | "other"; openWeights; kind; mode; releaseDate?; description; reference: Listing;
  listings: Listing[]; hostCount: number; capabilities; features; reasoningEfforts; modalities;
  contextWindow; maxOutputTokens; status; deprecationDate?; preview: boolean; specialPurpose:
  boolean; successorSlug?: string; predecessorSlugs: string[]; isCurrent: boolean }`;
  `CatalogIndex { models: CanonicalModel[]; bySlug: Map<string, CanonicalModel>; byListingId:
  Map<string, CanonicalModel>; hosts: HostSummary[]; generatedAt?: string; now: string }`;
  `HostSummary { id; slug; name; kind; modelCount; frontierCount }`.
- `group.ts`: `toListing(m: Model, provider: Provider): Listing`;
  `buildIndex(models: Model[], providers: Provider[], opts: { now: Date; generatedAt?: string }):
  CatalogIndex`; `blended(input: number, output: number | null): number | null`;
  `pickReference(listings: Listing[], labId: LabId | null): Listing`.
- `lineage.ts`: `lineAndVersion(key: string): { line: string; version: number[] }`;
  `compareVersions(a: number[], b: number[]): number`; `assignLineage(models: CanonicalModel[],
  today: string): void` (sets successorSlug, predecessorSlugs, isCurrent).
- `select.ts`: `releaseRadar(index, { days: number; tier?: "frontier" | "open" | "all" }):
  CanonicalModel[]`; `frontierLineup(index, perLab: number): { lab: Lab; models:
  CanonicalModel[] }[]`; `retiring(index, { fromDays: number; toDays: number }): RetiringItem[]`
  where `RetiringItem { model; date; daysLeft; hosts: string[]; successor?: CanonicalModel }`;
  `filterModels(index, q: ModelFilter): CanonicalModel[]` with `ModelFilter { tier?: "frontier"
  | "open" | "all"; lab?: string; kind?: ModelKind | "all"; q?: string; sort?: "newest" |
  "price" | "context" | "hosts" | "name"; includeRetired?: boolean }`.

- [ ] **Step 1: Write failing tests**: `groups Opus 5.5 listings into one model` (21 sample rows
  → one slug `claude-opus-5-5`, labId anthropic, name `Claude Opus 5.5`, reference host
  Anthropic, `reference.pricing.inputPerMTok === 4`, hostCount counts distinct non-subscription
  hosts, releaseDate `2026-09-22`, kind chat although Perplexity's row is `responses`);
  `fast listing folds in with fast flag`; `GPT-4o snapshots group with earliest date`;
  `subscription listings are kept but never reference`; `unpriced model reference falls back
  and priced=false`; lineage: `claude-sonnet-4-5 → successor claude-sonnet-5-5 across word
  orders`, `gpt-6-sol successor is gpt-6-1-sol`, `preview never succeeds GA`,
  `retired model is not current`; select: `releaseRadar(days 60, frontier) contains
  gemini-4-argon and not open-weight models`, `retiring sorts by date and attaches successor`,
  `filterModels default (tier frontier, kind chat, sort newest) puts dated models first`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Leave uncommitted.**

### Task W3: Alternatives, costs, quickstart snippets

**Files:** Create `src/lib/catalog/{alternatives.ts,cost.ts,quickstart.ts}`; tests
`__tests__/{alternatives,cost,quickstart}.test.ts`. Delete `src/lib/alternatives.ts`,
`src/lib/pricing.ts` once nothing imports them (Task W6).

**Interfaces:**
- `alternatives.ts`: `KEY_CAPS: CapabilityKey[] = ["toolCalling","functionCalling","vision",
  "reasoning","structuredOutputs","promptCaching"]`; `interface Alternative { model:
  CanonicalModel; listing: Listing; saving: number | null (0..1); coverage: number (0..1);
  missing: CapabilityKey[] }`; `interface AlternativeBuckets { cheaperHosts: Alternative[];
  sameLab: Alternative[]; frontier: Alternative[]; openWeight: Alternative[]; priced: boolean }`;
  `findAlternatives(target: CanonicalModel, index: CatalogIndex): AlternativeBuckets` (limits:
  hosts 5, sameLab 3, frontier 4, openWeight 4; rules in the spec).
- `cost.ts`: `interface Workload { inputTokens: number; outputTokens: number; requestsPerDay:
  number; cacheHitRate: number (0..1); batch: boolean }`; `PRESETS: { id: string; label: string;
  workload: Workload }[]`; `monthlyCost(p: Pricing, w: Workload): { total: number; perRequest:
  number; usedBatch: boolean; usedCache: boolean; longContext: boolean } | null` (null when
  unpriced; 30 days; cache hits bill at `cachedInputPerMTok` when present; batch uses batch prices
  when present, else standard and `usedBatch=false`; long-context prices when inputTokens >
  threshold).
- `quickstart.ts`: `quickstartSnippets(model: CanonicalModel): { id: string; label: string;
  lang: "python" | "typescript" | "bash"; code: string }[]` — native SDK for openai, anthropic,
  google, xai (OpenAI-compatible base URL `https://api.x.ai/v1`), plus LiteLLM
  (`model="<litellmProvider>/<apiModelId>"` from the reference listing) and curl for
  OpenAI-compatible first-party APIs.

- [ ] **Step 1: Write failing tests**: `opus alternatives never include claude-opus-5-5 outside
  cheaperHosts`; `every frontier/openWeight/sameLab alternative is cheaper (saving > 0)`;
  `sameLab picks current smaller Anthropic models (sonnet/haiku 5.5)`; `frontier bucket excludes
  anthropic`; `unpriced target returns priced=false and saving null`; cost: `1M in + 1M out at
  $2/$10 once per day for 30 days = $360`, `50% cache hit at $0.20 cache read lowers input cost
  exactly`, `batch without batch price → usedBatch false and same total`, `long context switches
  to above-threshold prices`, `unpriced → null`; quickstart: `anthropic model yields anthropic
  python snippet with model id claude-opus-5-5`, `litellm snippet uses provider prefix`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Leave uncommitted.**

### Task W4: Theme, layout, navigation, logo

**Files:** Rewrite `src/app/globals.css` (light tokens on `:root`, dark on
`[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` under
`:root[data-theme="system"]`; Tailwind `@theme inline` maps `--color-*` to them; add
`--font-mono`); modify `src/app/layout.tsx` (inline theme script in `<head>` reading
`localStorage["impulse-theme"]` → `data-theme`, default `light`; site header + footer; analytics
beacon); create `src/components/site/{SiteHeader.tsx,SiteFooter.tsx,ThemeToggle.tsx,Logo.tsx,
Container.tsx}`, `src/components/ui/{Section.tsx,Badge.tsx,Price.tsx,StatTile.tsx,DataTable.tsx,
Chip.tsx,LabMark.tsx,CopyButton.tsx,Tabs.tsx}`; replace `src/app/icon.svg`; fix hard-coded dark
colours in reused components (`CodeBlock`, `Popover`).

**Interfaces:**
- `ThemeToggle` cycles light → dark → system, writes `localStorage["impulse-theme"]` and
  `document.documentElement.dataset.theme`.
- `SiteHeader` nav: Models, Releases, Retiring, Compare, Calculator, Labs, Hosts; ⌘K search
  button; ThemeToggle. `SiteFooter` props `{ visitors30d: number | null; generatedAt?: string }`.
- Token names kept for compatibility: `bg, panel, elevated, hover, border, border-2,
  border-strong, ink, ink-2, ink-3, ink-4, accent, accent-dim, accent-line, ok, warn, err`, plus
  `sunken`, `accent-ink`.

- [ ] **Step 1:** Contrast check script (one-off, scratchpad) asserting ink…ink-4 and accent ≥ 4.5:1
  on bg and panel in both themes; run it → must pass before moving on.
- [ ] **Step 2:** Implement; `npm run lint` clean; screenshot `/` light + dark at 1440 and 390 wide.
- [ ] **Step 3: Leave uncommitted.**

### Task W5: Pages

**Files:** Create `src/lib/data/catalog-index.ts` (`getCatalogIndex(): Promise<CatalogIndex>`,
memoised per catalog load) and `src/lib/routes.ts` (`modelHref(m)`, `labHref(id)`,
`hostHref(slug)`, `resolveModelRoute(index, lab, model): { model } | { redirect: string } |
null`, test `__tests__/routes.test.ts`). Pages (all `revalidate = 300` unless noted):
`src/app/page.tsx`, `src/app/models/page.tsx` (dynamic on searchParams),
`src/app/models/[lab]/[model]/page.tsx`, `src/app/releases/page.tsx`,
`src/app/releases/feed.xml/route.ts`, `src/app/retiring/page.tsx`, `src/app/compare/page.tsx`,
`src/app/calculator/page.tsx` (+ client `Calculator.tsx`), `src/app/labs/page.tsx`,
`src/app/labs/[lab]/page.tsx`, `src/app/hosts/page.tsx`, `src/app/hosts/[host]/page.tsx`,
`src/app/not-found.tsx`. Components under `src/components/{home,models,detail,compare,
calculator,releases}/`. Search: `src/app/api/search-index/route.ts` (canonical rows `{s, l, n,
k, t, r}`) and a rewritten `CommandMenu` that fetches it once on first open.

- [ ] **Step 1:** routes test: `resolveModelRoute` returns the model for `anthropic/claude-opus-5-5`,
  a redirect for `openai/claude-opus-5-5`, null for `x/unknown` → run → FAIL → implement → PASS.
- [ ] **Step 2:** Build pages one at a time, each verified by loading it on the dev server
  (`curl -s -o /dev/null -w '%{http_code}'` = 200, no server error in the dev log).
- [ ] **Step 3: Leave uncommitted.**

### Task W6: Analytics, stats, redirects, cleanup

**Files:** Create `src/app/api/v/route.ts` (POST; body `{p, r}`; IP from `x-real-ip`, else first
`x-forwarded-for`; UA from header; forwards to `POST /v1/analytics/hit`; always 204),
`src/components/site/Beacon.tsx` (client; on pathname change, skipped when `navigator.doNotTrack
=== "1"` or `globalPrivacyControl`), `src/app/stats/page.tsx` (`revalidate = 60`; daily bar
chart following the dataviz skill), DataSource methods `getPriceChanges(days)`,
`getAnalyticsSummary(days)`, `recordHit(hit)`, `getCatalogMeta()`; redirects in
`next.config.ts` for static `/app/*` paths and `src/app/app/models/[id]/page.tsx` /
`src/app/app/providers/[id]/page.tsx` resolving GUIDs. Delete the old `/app/*` pages, old
components no longer imported (Playground, Settings, ApiExplorer, PricingExplorer,
ModelsExplorer…), unused `/api/*` handlers, `src/lib/alternatives.ts`, `src/lib/pricing.ts`.
Update `AGENTS.md` (routes, light-first, canonical slugs) and `README.md`.

- [ ] **Step 1:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` (against the
  local API on 8090) all pass.
- [ ] **Step 2:** Playwright screenshots: home, models, Opus 5.5 detail, releases, retiring,
  compare, calculator, stats — light and dark, 1440 and 390 wide; no console errors.
- [ ] **Step 3:** Beacon check: a POST to `/api/v` with a browser UA increments
  `/v1/analytics/summary` on the local API (local analytics DB only).
- [ ] **Step 4: Leave uncommitted.** Report to the owner; ask before commit/push/deploy.

## Deploy notes (for the approval request, not executed by this plan)

API unit: add `StateDirectory=impulse` and `Environment=IMPULSE_ANALYTICS_DB=/var/lib/impulse/analytics.db`
(mirror in `/root/ai_pilled/impulse/systemd/`). Steps: pull both repos, `uv sync --no-dev`,
restart `impulse-api`, `npm ci && npm run build`, chown `.next` to `impulse`, restart
`impulse-web`. Do **not** run `deploy.sh` (it starts the sync).
