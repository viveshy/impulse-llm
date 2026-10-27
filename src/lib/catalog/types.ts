import type { CapabilityKey, DeprecationStatus, Modality, Pricing } from "@/lib/domain/types";
import type { HostInfo, HostKind } from "./hosts";
import type { LabId, LabTier } from "./labs";

export type ModelKind =
  | "chat"
  | "image"
  | "video"
  | "speech"
  | "transcription"
  | "realtime"
  | "embedding"
  | "rerank"
  | "moderation"
  | "search"
  | "ocr"
  | "other";

/** One host's offer of a model (one API row), interpreted. */
export interface Listing {
  /** API GUID of the row. */
  id: string;
  hostId: string;
  host: HostInfo;
  /** The id you pass to this host's API. */
  apiModelId: string;
  key: string;
  snapshot?: string;
  region?: string;
  deployment?: string;
  variant?: string;
  vendor?: string;
  fast: boolean;
  fineTune: boolean;
  /** Provisioned-throughput commitments: no per-token price. */
  commitment: boolean;
  alias: boolean;
  mode: string;
  kind: ModelKind;
  status: DeprecationStatus;
  /** When the host retires it, or with `notBefore`, the earliest day it may. */
  deprecationDate?: string;
  /** The host's date is only the earliest it may retire the model ("not sooner than"), not a shutdown. */
  notBefore: boolean;
  releaseDate?: string;
  pricing: Pricing;
  priced: boolean;
  /** (3 × input + output) / 4; just input when no output price is listed; null when unpriced. */
  blended: number | null;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: CapabilityKey[];
  features: string[];
  reasoningEfforts: string[];
  modalities: { input: Modality[]; output: Modality[] };
  description: string;
  openWeights: boolean;
  license?: string;
  /** Smallest GPU memory to self-host it (open weights). */
  minVramGb?: number;
  /** Local runtimes that can run it (ollama, vllm, …). */
  runtimes: string[];
  sourceUrl?: string;
  litellmProvider?: string;
}

/** A model, with every host's listing of it folded in. */
export interface CanonicalModel {
  slug: string;
  labId: LabId | null;
  /** URL segment: the lab id, or "other". */
  labSlug: string;
  labName: string;
  name: string;
  line: string;
  version: number[];
  tier: LabTier;
  openWeights: boolean;
  kind: ModelKind;
  mode: string;
  releaseDate?: string;
  description: string;
  /** The listing that sets the headline price: the lab's own API where possible. */
  reference: Listing;
  listings: Listing[];
  /** Distinct hosts you can call it on (subscriptions and local runtimes excluded). */
  hostCount: number;
  capabilities: CapabilityKey[];
  features: string[];
  reasoningEfforts: string[];
  modalities: { input: Modality[]; output: Modality[] };
  contextWindow: number;
  maxOutputTokens: number;
  status: DeprecationStatus;
  /** When the reference listing's host retires it (an earliest-possible date doesn't count). */
  deprecationDate?: string;
  preview: boolean;
  /** Only a moving `-latest` alias with no version of its own (`gemini-pro-latest`). */
  aliasOnly: boolean;
  /** Search, audio, realtime, image… models: never offered as a general alternative. */
  specialPurpose: boolean;
  /** Newest model in the same line, when this one is not it. */
  successorSlug?: string;
  /** Older models in the same line, newest first. */
  predecessorSlugs: string[];
  /** Newest in its line and not retired. */
  isCurrent: boolean;
}

export interface HostSummary {
  id: string;
  slug: string;
  name: string;
  kind: HostKind;
  modelCount: number;
  frontierCount: number;
}

export interface CatalogIndex {
  models: CanonicalModel[];
  bySlug: Map<string, CanonicalModel>;
  byListingId: Map<string, CanonicalModel>;
  hosts: HostSummary[];
  hostBySlug: Map<string, HostSummary>;
  generatedAt?: string;
  /** ISO date (YYYY-MM-DD) the index was built for. */
  today: string;
}
