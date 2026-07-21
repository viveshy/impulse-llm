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

export interface Pricing {
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. `null` when N/A (e.g. embeddings). */
  outputPerMTok: number | null;
  cachedInputPerMTok?: number;
  batchDiscount?: number;
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
}

/* ---------- query + facets (data-source contract) ---------- */

export type ModelSort =
  | "popularity"
  | "priceInputAsc"
  | "priceInputDesc"
  | "contextDesc"
  | "releaseDesc"
  | "nameAsc";

export interface ModelQuery {
  search?: string;
  providerIds?: string[];
  capabilities?: CapabilityKey[];
  openOnly?: boolean;
  includeDeprecated?: boolean;
  maxInputPrice?: number;
  minContext?: number;
  sort?: ModelSort;
}

export interface Facets {
  providers: { id: string; name: string; count: number }[];
  capabilities: { key: CapabilityKey; count: number }[];
  priceInputRange: [number, number];
  contextRange: [number, number];
  total: number;
}
