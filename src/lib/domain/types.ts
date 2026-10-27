/**
 * Impulse - domain model.
 * The single source of truth for the shape of providers and models.
 * The seed data and (later) the real API adapter both produce these types.
 */

export type Modality = "text" | "image" | "audio" | "video" | "embedding";

export type DeprecationStatus = "active" | "deprecating" | "deprecated" | "preview";

export type ProviderCategory = "frontier" | "open" | "cloud" | "inference";

export type AuthType = "api-key" | "bearer" | "oauth" | "aws-sigv4";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** Ordered list of every capability Impulse tracks. Order drives display. */
export const CAPABILITY_KEYS = [
  "streaming",
  "functionCalling",
  "toolCalling",
  "jsonMode",
  "structuredOutputs",
  "reasoning",
  "vision",
  "audio",
  "imageInput",
  "imageGeneration",
  "video",
  "embeddings",
  "batchApi",
  "promptCaching",
  "mcp",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export type Capabilities = Record<CapabilityKey, boolean>;

export interface Endpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  streaming: boolean;
  auth: string;
}

export interface Sdk {
  language: string;
  packageName: string;
  installCommand: string;
  docsUrl: string;
}

export interface Provider {
  id: string;
  name: string;
  /** 1-2 char monogram used in the (logo-free) glyph. */
  monogram: string;
  description: string;
  website: string;
  /** Real inference base URL. Undefined when unknown - never derive one from `website`. */
  apiBase?: string;
  category: ProviderCategory;
  authType: AuthType;
  regions: string[];
  endpoints: Endpoint[];
  sdks: Sdk[];
  foundedYear?: number;
}

export interface LongContextPricing {
  /** Prompts longer than this many tokens bill at the prices below. */
  thresholdTokens: number;
  inputPerMTok: number;
  outputPerMTok?: number;
  cachedInputPerMTok?: number;
  batchInputPerMTok?: number;
  batchOutputPerMTok?: number;
}

/** All prices are USD per 1M tokens unless the name says otherwise. */
export interface Pricing {
  /** 0 means the host lists no price, not that the model is free. */
  inputPerMTok: number;
  /** `null` when N/A (e.g. embeddings). */
  outputPerMTok: number | null;
  cachedInputPerMTok?: number;
  batchDiscount?: number;
  /** Prompt-cache writes: default (5-minute) and 1-hour TTL. */
  cacheWritePerMTok?: number;
  cacheWrite1hPerMTok?: number;
  batchInputPerMTok?: number;
  batchOutputPerMTok?: number;
  flexInputPerMTok?: number;
  flexOutputPerMTok?: number;
  priorityInputPerMTok?: number;
  priorityOutputPerMTok?: number;
  longContext?: LongContextPricing;
  /** USD per web-search call. */
  webSearchPerQuery?: number;
  /** Multiplier for regional (data-residency) processing, e.g. 1.1. */
  regionalUplift?: number;
}

export interface ContextSpec {
  contextWindow: number;
  maxOutputTokens: number;
}

export interface Performance {
  ttftMs?: number;
  tokensPerSec?: number;
  availabilityPct?: number;
}

export interface RateLimits {
  rpm?: number;
  tpm?: number;
  tier?: string;
}

export interface Benchmark {
  name: string;
  score: number;
  max: number;
}

export interface Openness {
  isOpenWeights: boolean;
  license?: string;
  openSourceScore?: number;
  runtimes?: string[];
  minVramGb?: number;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  family?: string;
  description: string;
  /** What the model does: chat, completion, embedding, image_generation, … */
  mode?: string;
  /** ISO date (YYYY-MM-DD). */
  releaseDate: string;
  deprecation: DeprecationStatus;
  pricing: Pricing;
  context: ContextSpec;
  capabilities: Capabilities;
  modalities: { input: Modality[]; output: Modality[] };
  performance: Performance;
  rateLimits?: RateLimits;
  benchmarks?: Benchmark[];
  openness: Openness;
  /** 0-100; higher = more popular. */
  popularity?: number;
  tags?: string[];
  endpointIds: string[];
  metadata?: Record<string, unknown>;
  /** What sits between host and model in the LiteLLM key (`eu`, `us-gov-east-1`…). */
  route?: string;
  litellmProvider?: string;
  /** ISO date the host retires this listing. */
  deprecationDate?: string;
  /** The host's own pricing page. */
  sourceUrl?: string;
  /** Extended feature flags (webSearch, computerUse, pdfInput…). */
  features?: string[];
  reasoningEfforts?: string[];
  /** Verbatim LiteLLM cost-map entry (model detail only). */
  spec?: Record<string, unknown>;
}

/* ---------- catalog snapshot, price moves, visitor analytics ---------- */

export interface CatalogSnapshot {
  models: Model[];
  providers: Provider[];
  /** The sync's `meta` table: generated_at, models, providers, … (strings). */
  meta: Record<string, string>;
  /** When this process fetched it (ms epoch). */
  loadedAt: number;
}

export interface PriceChange {
  listingId: string;
  name: string;
  host: { id: string; name: string };
  route?: string;
  from: { inputPerMTok: number | null; outputPerMTok: number | null };
  to: { inputPerMTok: number | null; outputPerMTok: number | null };
  /** ISO timestamp the sync saw the new price. */
  at: string;
}

export interface DailyTraffic {
  day: string;
  views: number;
  visitors: number;
}

export interface AnalyticsSummary {
  days: number;
  generatedAt: string;
  /** Visitors are distinct per day, so a window's total is the sum of daily visitors. */
  totals: { views: number; visitors: number };
  today: { views: number; visitors: number };
  allTime: { views: number; since: string | null };
  daily: DailyTraffic[];
  topPages: { path: string; views: number }[];
  /** Ranked by visitors, so reloading with a made-up referrer doesn't climb the list. */
  topReferrers: { host: string; visitors: number }[];
}

export interface PageHit {
  path: string;
  ip: string;
  ua: string;
  ref?: string;
}
