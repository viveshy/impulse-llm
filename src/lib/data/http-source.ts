/**
 * The real backend: reads the paginated impulse-api (which serves the SQLite
 * catalog the sync builds). The sole `DataSource` implementation - there is no
 * bundled-seed fallback.
 *
 * The API is deliberately paginated (anti-scraping); as a trusted server-side
 * consumer we page through it once, cache in memory, and run the SAME in-memory
 * query logic (`./query`) the seed source uses. Models/providers are addressed
 * by their opaque GUID - that GUID becomes the FE `id`.
 */
import { CAPABILITY_KEYS } from "@/lib/domain/types";
import type {
  Capabilities,
  DeprecationStatus,
  Endpoint,
  Facets,
  Modality,
  Model,
  ModelQuery,
  Provider,
} from "@/lib/domain/types";
import type { DataSource } from "./data-source";
import { computeFacets, matchesQuery, type ModelPage, paginateModels, sortModels } from "./query";

const u = <T,>(v: T | null | undefined): T | undefined => v ?? undefined;

function capabilityRecord(keys: string[]): Capabilities {
  const rec = Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, false])) as Capabilities;
  for (const k of keys) if (k in rec) rec[k as keyof Capabilities] = true;
  return rec;
}

/* ---------- BE DTO → FE domain ---------- */

interface ModelDto {
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
  pricing: { inputPerMtok: number | null; outputPerMtok: number | null; cachedInputPerMtok: number | null };
  performance: { ttftMs: number | null; tokensPerSec: number | null; availabilityPct: number | null };
  // detail only:
  benchmarks?: { name: string; score: number; max: number; source?: string | null }[];
  endpoints?: { name: string; method: string; path: string }[];
}

function mapModel(d: ModelDto): Model {
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
      inputPerMTok: d.pricing.inputPerMtok ?? 0,
      outputPerMTok: d.pricing.outputPerMtok,
      cachedInputPerMTok: u(d.pricing.cachedInputPerMtok),
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
  };
}

interface ProviderDto {
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

function mapProvider(d: ProviderDto): Provider {
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

/* ---------- source ---------- */

const CACHE_TTL_MS = 10 * 60 * 1000;
type Catalog = { at: number; models: Model[]; providers: Provider[] };

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
          const bulk = await this.getJson<{ models: ModelDto[]; providers: ProviderDto[] }>(
            "/v1/catalog",
            { cache: "no-store" },
          );
          this.cache = {
            at: Date.now(),
            models: bulk.models.map(mapModel),
            providers: bulk.providers.map(mapProvider),
          };
        } catch {
          const [models, providers] = await Promise.all([
            pageAll<ModelDto>("models", mapModel) as Promise<Model[]>,
            pageAll<ProviderDto>("providers", mapProvider) as Promise<Provider[]>,
          ]);
          this.cache = { at: Date.now(), models, providers };
        }
        return this.cache;
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }

  async getProviders(): Promise<Provider[]> {
    const { providers } = await this.load();
    return [...providers].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProvider(id: string): Promise<Provider | null> {
    try {
      return mapProvider(await this.getJson<ProviderDto>(`/v1/providers/${id}`));
    } catch {
      return null;
    }
  }

  async getModel(id: string): Promise<Model | null> {
    try {
      return mapModel(await this.getJson<ModelDto>(`/v1/models/${id}`));
    } catch {
      return null;
    }
  }

  async getModelsByProvider(providerId: string): Promise<Model[]> {
    const { models } = await this.load();
    return sortModels(
      models.filter((m) => m.providerId === providerId),
      "releaseDesc",
    );
  }

  async getModels(query: ModelQuery = {}): Promise<Model[]> {
    const { models, providers } = await this.load();
    const providerName = (pid: string) => providers.find((p) => p.id === pid)?.name ?? pid;
    const filtered = models.filter((m) => matchesQuery(m, query, providerName));
    return sortModels(filtered, query.sort);
  }

  async getModelsPage(
    query: ModelQuery = {},
    cursor: string | null = null,
    limit = 50,
  ): Promise<ModelPage> {
    const { models, providers } = await this.load();
    const providerName = (pid: string) => providers.find((p) => p.id === pid)?.name ?? pid;
    const filtered = sortModels(models.filter((m) => matchesQuery(m, query, providerName)), query.sort);
    return paginateModels(filtered, { cursor, limit });
  }

  async getFacets(): Promise<Facets> {
    const { models, providers } = await this.load();
    return computeFacets(models, providers);
  }
}
