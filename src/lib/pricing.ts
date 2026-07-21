import type { Model } from "@/lib/domain/types";

export interface Workload {
  /** Millions of input tokens per month. */
  inputMTok: number;
  /** Millions of output tokens per month. */
  outputMTok: number;
}

export interface CostBreakdown {
  input: number;
  output: number;
  total: number;
}

/** Monthly cost (USD) of running `workload` on `model`. Pure + deterministic. */
export function computeCost(model: Model, workload: Workload): CostBreakdown {
  const input = workload.inputMTok * model.pricing.inputPerMTok;
  const output = workload.outputMTok * (model.pricing.outputPerMTok ?? 0);
  return { input, output, total: input + output };
}

/** Modes that actually bill per text token - the only ones a token cost estimate applies to. */
const TEXT_MODES = new Set(["chat", "completion", "responses"]);

/**
 * Models that make sense in a text-generation cost estimate. `mode` is the reliable
 * signal (declared output modalities are frequently missing upstream, which left image
 * generators looking like sub-cent text models and topping the cheapest ranking).
 */
export function isBillableForChat(model: Model): boolean {
  if (model.pricing.outputPerMTok === null) return false;
  return model.mode ? TEXT_MODES.has(model.mode) : true;
}

/**
 * Whether the provider actually publishes a price. A catalog entry that is $0 on both
 * input and output means the rate is *unpublished*, not free - ranking those as the
 * cheapest option is misleading, so callers sort them last and render "-" instead of $0.00.
 */
export function hasPublishedPrice(model: Model): boolean {
  return (model.pricing.inputPerMTok ?? 0) > 0 || (model.pricing.outputPerMTok ?? 0) > 0;
}

export function formatUSD(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
