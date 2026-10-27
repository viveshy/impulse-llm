/**
 * The real backend: reads the paginated impulse-api (which serves the SQLite
 * catalog the sync builds). The sole `DataSource` implementation - there is no
 * bundled-seed fallback.
 *
 * The API is deliberately paginated (anti-scraping); as a trusted server-side
 * consumer we load the whole catalog in one internal request and cache it in memory.
 * Listings and hosts keep their opaque API GUID as the FE `id`; pages address models
 * by the canonical keys `src/lib/catalog` derives from listing names.
 */
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { CAPABILITY_KEYS } from "@/lib/domain/types";
import type {
  AnalyticsSummary,
  Capabilities,
  CatalogSnapshot,
  DeprecationStatus,
  Endpoint,
  Modality,
  Model,
  PageHit,
  PriceChange,
  Provider,
} from "@/lib/domain/types";
import type { DataSource } from "./data-source";

const u = <T,>(v: T | null | undefined): T | undefined => v ?? undefined;

/** Prices arrive as per-token floats × 1e6 (0.09999999999999999); 6 decimals is exact enough. */
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const price = (v: number | null | undefined): number | undefined => (v === null || v === undefined ? undefined : r6(v));

function capabilityRecord(keys: string[]): Capabilities {
  const rec = Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, false])) as Capabilities;
  for (const k of keys) if (k in rec) rec[k as keyof Capabilities] = true;
  return rec;
}

/* ---------- BE DTO → FE domain ---------- */

export interface ModelDto {
  guid: string;
  name: string;
  family: string | null;
  mode: string | null;
  status: DeprecationStatus;
  provider: { guid: string; name: string };
  description: string;
  releaseDate: string | null;
  popularity: number | null;
  isOpenWeights: boolean;
  license: { name: string; isOpen: boolean } | null;
  openSourceScore: number | null;
  minVramGb: number | null;
  runtimes: string[];
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  modalities: { input: string[]; output: string[] };
  tags: string[];
  pricing: {
    inputPerMtok: number | null;
    outputPerMtok: number | null;
    cachedInputPerMtok: number | null;
    cacheWritePerMtok?: number | null;
    cacheWrite1hPerMtok?: number | null;
    batchInputPerMtok?: number | null;
    batchOutputPerMtok?: number | null;
    flexInputPerMtok?: number | null;
    flexOutputPerMtok?: number | null;
    priorityInputPerMtok?: number | null;
    priorityOutputPerMtok?: number | null;
    longContext?: {
      thresholdTokens: number;
      inputPerMtok: number;
      outputPerMtok: number | null;
      cachedInputPerMtok?: number | null;
      batchInputPerMtok?: number | null;
      batchOutputPerMtok?: number | null;
    } | null;
    webSearchPerQuery?: number | null;
    regionalUplift?: number | null;
  };
  performance: { ttftMs: number | null; tokensPerSec: number | null; availabilityPct: number | null };
  route?: string | null;
  litellmProvider?: string | null;
  deprecationDate?: string | null;
  sourceUrl?: string | null;
  features?: string[];
  reasoningEfforts?: string[];
  rateLimits?: { rpm: number | null; tpm: number | null } | null;
  // detail only:
  benchmarks?: { name: string; score: number; max: number; source?: string | null }[];
  endpoints?: { name: string; method: string; path: string }[];
  spec?: Record<string, unknown>;
}

export function mapModel(d: ModelDto): Model {
  const p = d.pricing;
  const endpointIds = (d.endpoints ?? []).map((e) => `${d.provider.guid}:${e.path.split("/").pop()}`);
  return {
    id: d.guid,
    name: d.name,
    providerId: d.provider.guid,
    family: u(d.family) || undefined,
    description: d.description ?? "",
    mode: u(d.mode),
    releaseDate: d.releaseDate ?? "",
    deprecation: d.status,
    pricing: {
      inputPerMTok: price(p.inputPerMtok) ?? 0,
      outputPerMTok: price(p.outputPerMtok) ?? null,
      cachedInputPerMTok: price(p.cachedInputPerMtok),
      cacheWritePerMTok: price(p.cacheWritePerMtok),
      cacheWrite1hPerMTok: price(p.cacheWrite1hPerMtok),
      batchInputPerMTok: price(p.batchInputPerMtok),
      batchOutputPerMTok: price(p.batchOutputPerMtok),
      flexInputPerMTok: price(p.flexInputPerMtok),
      flexOutputPerMTok: price(p.flexOutputPerMtok),
      priorityInputPerMTok: price(p.priorityInputPerMtok),
      priorityOutputPerMTok: price(p.priorityOutputPerMtok),
      longContext: p.longContext
        ? {
            thresholdTokens: p.longContext.thresholdTokens,
            inputPerMTok: r6(p.longContext.inputPerMtok),
            outputPerMTok: price(p.longContext.outputPerMtok),
            cachedInputPerMTok: price(p.longContext.cachedInputPerMtok),
            batchInputPerMTok: price(p.longContext.batchInputPerMtok),
            batchOutputPerMTok: price(p.longContext.batchOutputPerMtok),
          }
        : undefined,
      webSearchPerQuery: u(p.webSearchPerQuery),
      regionalUplift: u(p.regionalUplift),
    },
    context: { contextWindow: d.contextWindow ?? 0, maxOutputTokens: d.maxOutputTokens ?? 0 },
    capabilities: capabilityRecord(d.capabilities ?? []),
    modalities: {
      input: (d.modalities?.input ?? []) as Modality[],
      output: (d.modalities?.output ?? []) as Modality[],
    },
    performance: {
      ttftMs: u(d.performance?.ttftMs),
      tokensPerSec: u(d.performance?.tokensPerSec),
      availabilityPct: u(d.performance?.availabilityPct),
    },
    benchmarks: d.benchmarks?.map((b) => ({ name: b.name, score: b.score, max: b.max })),
    openness: {
      isOpenWeights: d.isOpenWeights,
      license: u(d.license?.name),
      openSourceScore: u(d.openSourceScore),
      runtimes: d.runtimes ?? [],
      minVramGb: u(d.minVramGb),
    },
    popularity: u(d.popularity),
    tags: d.tags ?? [],
    endpointIds,
    rateLimits: d.rateLimits ? { rpm: u(d.rateLimits.rpm), tpm: u(d.rateLimits.tpm) } : undefined,
    route: u(d.route) || undefined,
    litellmProvider: u(d.litellmProvider),
    deprecationDate: u(d.deprecationDate) || undefined,
    sourceUrl: u(d.sourceUrl) || undefined,
    features: d.features ?? [],
    reasoningEfforts: d.reasoningEfforts ?? [],
    spec: d.spec,
  };
}

export interface ProviderDto {
  guid: string;
  name: string;
  website: string;
  apiBase: string | null;
  category: Provider["category"];
  description: string;
  monogram: string | null;
  authType: Provider["authType"];
  foundedYear: number | null;
  regions?: string[];
  endpoints?: { name: string; method: string; path: string; description: string; streaming: number; auth: string }[];
  sdks?: { language: string; packageName: string; installCommand: string; docsUrl: string }[];
}

export function mapProvider(d: ProviderDto): Provider {
  const endpoints: Endpoint[] = (d.endpoints ?? []).map((e) => ({
    id: `${d.guid}:${e.path.split("/").pop()}`,
    name: e.name,
    method: e.method as Endpoint["method"],
    path: e.path,
    description: e.description,
    streaming: !!e.streaming,
    auth: e.auth,
  }));
  return {
    id: d.guid,
    name: d.name,
    monogram: d.monogram || d.name.charAt(0).toUpperCase(),
    description: d.description ?? "",
    website: d.website ?? "",
    apiBase: u(d.apiBase),
    category: d.category,
    authType: d.authType,
    regions: d.regions ?? [],
    endpoints,
    sdks: (d.sdks ?? []).map((s) => ({
      language: s.language,
      packageName: s.packageName,
      installCommand: s.installCommand,
      docsUrl: s.docsUrl,
    })),
    foundedYear: u(d.foundedYear),
  };
}

export interface PriceChangeDto {
  guid: string;
  name: string;
  provider: { guid: string; name: string };
  route: string | null;
  from: { inputPerMtok: number | null; outputPerMtok: number | null };
  to: { inputPerMtok: number | null; outputPerMtok: number | null };
  at: string;
}

export function mapPriceChange(d: PriceChangeDto): PriceChange {
  const side = (x: PriceChangeDto["from"]) => ({
    inputPerMTok: price(x.inputPerMtok) ?? null,
    outputPerMTok: price(x.outputPerMtok) ?? null,
  });
  return {
    listingId: d.guid,
    name: d.name,
    host: { id: d.provider.guid, name: d.provider.name },
    ...(d.route ? { route: d.route } : {}),
    from: side(d.from),
    to: side(d.to),
    at: d.at,
  };
}

/**
 * GET outside Next's instrumented fetch. The bulk catalog is over the data cache's 2MB
 * limit, and an uncached `fetch` would make every page that reads it dynamic; this way
 * pages stay statically generated (ISR) and the in-memory cache below does the reuse.
 */
function getJsonDirect<T>(url: string, timeoutMs = 30_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const send = u.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(u, { headers: { accept: "application/json" }, timeout: timeoutMs }, (res) => {
      if ((res.statusCode ?? 500) >= 400) {
        res.resume();
        reject(new Error(`GET ${u.pathname} -> ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("error", reject);
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`GET ${u.pathname} timed out`)));
    req.on("error", reject);
    req.end();
  });
}

/* ---------- source ---------- */

const CACHE_TTL_MS = 5 * 60 * 1000;
type Catalog = { at: number; models: Model[]; providers: Provider[]; meta: Record<string, string> };

export class HttpDataSource implements DataSource {
  private cache: Catalog | null = null;
  private inflight: Promise<Catalog> | null = null;

  constructor(private readonly baseUrl: string) {}

  private async getJson<T>(path: string, init?: RequestInit): Promise<T> {
    // Small per-item responses go through Next's data cache (5-min revalidate).
    // The bulk /v1/catalog response passes `cache: no-store` because it exceeds Next's
    // 2MB data-cache limit; our own in-memory cache (below) covers reuse for it instead.
    const res = await fetch(`${this.baseUrl}${path}`, init ?? { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return (await res.json()) as T;
  }

  /**
   * Page through the full catalog once, then cache. Concurrent callers (a page
   * fetches models + providers + facets at once) share ONE paging pass via the
   * in-flight promise, instead of each stampeding the backend with ~30 requests.
   */
  private load(): Promise<Catalog> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return Promise.resolve(this.cache);
    if (this.inflight) return this.inflight;

    // One bulk request for the whole catalog (~50ms server-side) instead of paging it
    // in ~30 round trips. Falls back to paging if the bulk endpoint is unavailable.
    const pageAll = async <D>(kind: string, map: (d: D) => unknown): Promise<unknown[]> => {
      type Page = { data: D[]; pagination: { pages: number } };
      const first = await this.getJson<Page>(`/v1/${kind}?limit=100&page=1`);
      const out = first.data.map(map);
      for (let page = 2; page <= first.pagination.pages; page++) {
        const r = await this.getJson<Page>(`/v1/${kind}?limit=100&page=${page}`);
        out.push(...r.data.map(map));
      }
      return out;
    };

    this.inflight = (async () => {
      try {
        try {
          const bulk = await getJsonDirect<{
            models: ModelDto[];
            providers: ProviderDto[];
            meta?: Record<string, string>;
          }>(`${this.baseUrl}/v1/catalog`);
          this.cache = {
            at: Date.now(),
            models: bulk.models.map(mapModel),
            providers: bulk.providers.map(mapProvider),
            meta: bulk.meta ?? {},
          };
        } catch {
          const [models, providers] = await Promise.all([
            pageAll<ModelDto>("models", mapModel) as Promise<Model[]>,
            pageAll<ProviderDto>("providers", mapProvider) as Promise<Provider[]>,
          ]);
          this.cache = { at: Date.now(), models, providers, meta: {} };
        }
        return this.cache;
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }

  async getCatalog(): Promise<CatalogSnapshot> {
    const { at, models, providers, meta } = await this.load();
    return { models, providers, meta, loadedAt: at };
  }

  async getPriceChanges(days: number): Promise<PriceChange[] | null> {
    try {
      const r = await this.getJson<{ changes: PriceChangeDto[] }>(`/v1/price-changes?days=${days}`);
      return r.changes.map(mapPriceChange);
    } catch (e) {
      console.error("price changes unavailable:", (e as Error).message);
      return null;
    }
  }

  async getAnalyticsSummary(days: number, revalidateSeconds = 300): Promise<AnalyticsSummary | null> {
    try {
      return await this.getJson<AnalyticsSummary>(`/v1/analytics/summary?days=${days}`, {
        next: { revalidate: revalidateSeconds },
      });
    } catch (e) {
      console.error("analytics summary unavailable:", (e as Error).message);
      return null;
    }
  }

  async recordHit(hit: PageHit): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/analytics/hit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(hit),
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) return false;
      return ((await res.json()) as { counted: boolean }).counted;
    } catch {
      return false;
    }
  }

  async getModel(id: string): Promise<Model | null> {
    try {
      return mapModel(await this.getJson<ModelDto>(`/v1/models/${id}`));
    } catch {
      return null;
    }
  }
}
