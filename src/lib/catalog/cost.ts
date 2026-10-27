/** What a workload costs per month on a given price sheet. */
import type { Pricing } from "@/lib/domain/types";

export interface Workload {
  inputTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  /** Share of input tokens served from the prompt cache, 0..1. */
  cacheHitRate: number;
  batch: boolean;
}

export const PRESETS: { id: string; label: string; workload: Workload }[] = [
  {
    id: "chat",
    label: "Chat assistant",
    workload: { inputTokens: 2_000, outputTokens: 500, requestsPerDay: 5_000, cacheHitRate: 0.3, batch: false },
  },
  {
    id: "rag",
    label: "RAG over documents",
    workload: { inputTokens: 8_000, outputTokens: 600, requestsPerDay: 2_000, cacheHitRate: 0.5, batch: false },
  },
  {
    id: "agent",
    label: "Coding agent",
    workload: { inputTokens: 40_000, outputTokens: 2_000, requestsPerDay: 1_000, cacheHitRate: 0.7, batch: false },
  },
  {
    id: "batch",
    label: "Overnight batch",
    workload: { inputTokens: 4_000, outputTokens: 400, requestsPerDay: 20_000, cacheHitRate: 0, batch: true },
  },
];

export interface CostEstimate {
  total: number;
  perRequest: number;
  usedBatch: boolean;
  usedCache: boolean;
  longContext: boolean;
}

const DAYS_PER_MONTH = 30;

export function monthlyCost(p: Pricing, w: Workload): CostEstimate | null {
  if (p.inputPerMTok <= 0 && (p.outputPerMTok ?? 0) <= 0) return null;

  const long = !!p.longContext && w.inputTokens > p.longContext.thresholdTokens;
  // Past the threshold every price steps up, so a discount counts only where the host lists it for long prompts.
  const sheet = long
    ? { ...p.longContext!, outputPerMTok: p.longContext!.outputPerMTok ?? p.outputPerMTok ?? 0 }
    : { ...p, outputPerMTok: p.outputPerMTok ?? 0 };

  const usedBatch = w.batch && sheet.batchInputPerMTok !== undefined;
  const inPrice = usedBatch ? sheet.batchInputPerMTok! : sheet.inputPerMTok;
  const outPrice = usedBatch ? (sheet.batchOutputPerMTok ?? sheet.outputPerMTok) : sheet.outputPerMTok;

  const usedCache = w.cacheHitRate > 0 && sheet.cachedInputPerMTok !== undefined;
  const hit = usedCache ? w.cacheHitRate : 0;
  const inputCost = w.inputTokens * (1 - hit) * inPrice + w.inputTokens * hit * (sheet.cachedInputPerMTok ?? 0);
  const perRequest = (inputCost + w.outputTokens * outPrice) / 1_000_000;

  return { total: perRequest * w.requestsPerDay * DAYS_PER_MONTH, perRequest, usedBatch, usedCache, longContext: long };
}
