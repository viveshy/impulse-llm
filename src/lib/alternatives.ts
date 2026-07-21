import type { Capabilities, CapabilityKey, Model } from "@/lib/domain/types";
import { CAPABILITY_KEYS } from "@/lib/domain/types";
import { CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import { computeCost } from "@/lib/pricing";
import { formatTokens } from "@/lib/utils/format";

/**
 * Similarity / alternatives engine - a pure function over the domain model.
 * Produces a ranked, explainable list of stand-ins for a given model.
 */

export type MigrationEffort = "Low" | "Medium" | "High";

export interface Deployment {
  label: "Managed API" | "Self-hosted" | "Easy" | "Moderate" | "Advanced" | "Enterprise";
  note: string;
}

export interface Alternative {
  model: Model;
  /** 0-100 match score. */
  score: number;
  gains: string[];
  losses: string[];
  migration: MigrationEffort;
  /** % monthly saving vs the base model at a reference workload, or null if not cheaper. */
  savingsPct: number | null;
  deployment: Deployment;
  /** Copyable one-line deploy command for open models, else null. */
  quickStart: string | null;
}

const CAP_WEIGHTS: Record<CapabilityKey, number> = {
  reasoning: 3,
  vision: 2,
  toolCalling: 2,
  functionCalling: 1,
  jsonMode: 1,
  structuredOutputs: 1,
  audio: 1,
  imageInput: 1,
  imageGeneration: 1,
  video: 1,
  embeddings: 1,
  mcp: 1,
  batchApi: 0.5,
  promptCaching: 0.5,
  streaming: 0.5,
};

const REFERENCE_WORKLOAD = { inputMTok: 10, outputMTok: 2 };

function avgBenchmark(m: Model): number | null {
  if (!m.benchmarks?.length) return null;
  return m.benchmarks.reduce((s, b) => s + b.score / b.max, 0) / m.benchmarks.length;
}

/** 1 when equal, decaying to 0 as values diverge on a log scale. */
function logCloseness(a: number, b: number, span: number): number {
  if (a <= 0 || b <= 0) return a === b ? 1 : 0;
  return Math.max(0, 1 - Math.abs(Math.log10(a) - Math.log10(b)) / span);
}

/** How well `alt` covers the capabilities `base` has (weighted), plus overall overlap. */
function capCoverage(base: Capabilities, alt: Capabilities): number {
  let need = 0;
  let have = 0;
  let match = 0;
  let total = 0;
  for (const k of CAPABILITY_KEYS) {
    const w = CAP_WEIGHTS[k];
    total += w;
    if (base[k] === alt[k]) match += w;
    if (base[k]) {
      need += w;
      if (alt[k]) have += w;
    }
  }
  const coverage = need > 0 ? have / need : 1;
  return 0.7 * coverage + 0.3 * (match / total);
}

function modalityOverlap(base: Model, alt: Model): number {
  const altSet = new Set(alt.modalities.input);
  const need = base.modalities.input;
  return need.length ? need.filter((m) => altSet.has(m)).length / need.length : 1;
}

function score(base: Model, alt: Model): number {
  const capS = capCoverage(base.capabilities, alt.capabilities);
  const ctxS = logCloseness(alt.context.contextWindow, base.context.contextWindow, 2.5);
  const costS = logCloseness(alt.pricing.inputPerMTok || 0.01, base.pricing.inputPerMTok || 0.01, 2.7);
  const bA = avgBenchmark(base);
  const bB = avgBenchmark(alt);
  const benchS = bA !== null && bB !== null ? Math.max(0, 1 - Math.abs(bA - bB)) : 0.55;
  const modS = modalityOverlap(base, alt);
  const perfS = logCloseness(alt.performance.ttftMs || 500, base.performance.ttftMs || 500, 1.2);
  return Math.round(
    100 * (0.36 * capS + 0.16 * ctxS + 0.14 * costS + 0.18 * benchS + 0.08 * modS + 0.08 * perfS),
  );
}

const KEY_CAPS: CapabilityKey[] = [
  "reasoning",
  "vision",
  "toolCalling",
  "audio",
  "imageGeneration",
  "structuredOutputs",
  "mcp",
];

function explain(base: Model, alt: Model): { gains: string[]; losses: string[] } {
  const gains: string[] = [];
  const losses: string[] = [];

  const bc = base.pricing.inputPerMTok;
  const ac = alt.pricing.inputPerMTok;
  if (bc > 0) {
    const pct = Math.round(((bc - ac) / bc) * 100);
    if (pct >= 10) gains.push(`${pct}% lower input cost`);
    else if (pct <= -10) losses.push("Higher input cost");
  }

  if (alt.openness.isOpenWeights && !base.openness.isOpenWeights) {
    gains.push("Open weights - self-hostable");
  }

  if (alt.context.contextWindow > base.context.contextWindow * 1.5) {
    gains.push(`Larger context (${formatTokens(alt.context.contextWindow)})`);
  } else if (alt.context.contextWindow < base.context.contextWindow * 0.75) {
    losses.push(
      `Smaller context (${formatTokens(alt.context.contextWindow)} vs ${formatTokens(base.context.contextWindow)})`,
    );
  }

  const bA = avgBenchmark(base);
  const bB = avgBenchmark(alt);
  if (bA !== null && bB !== null) {
    const diff = (bB - bA) * 100;
    if (diff >= 3) gains.push("Stronger benchmark scores");
    else if (diff <= -3) losses.push("Weaker benchmark scores");
  }

  for (const k of KEY_CAPS) {
    const label = CAPABILITY_LABELS[k].toLowerCase();
    if (base.capabilities[k] && !alt.capabilities[k]) losses.push(`No ${label}`);
    else if (!base.capabilities[k] && alt.capabilities[k]) gains.push(`Adds ${label}`);
  }

  const bl = base.performance.ttftMs;
  const al = alt.performance.ttftMs;
  if (bl && al && al < bl * 0.85) gains.push("Lower latency");

  return { gains: gains.slice(0, 5), losses: losses.slice(0, 4) };
}

function migrationEffort(base: Model, alt: Model): MigrationEffort {
  let m = 0;
  if (alt.providerId !== base.providerId) m += 1;
  if (
    (["toolCalling", "jsonMode", "structuredOutputs"] as CapabilityKey[]).some(
      (k) => base.capabilities[k] && !alt.capabilities[k],
    )
  ) {
    m += 1;
  }
  if (alt.openness.isOpenWeights !== base.openness.isOpenWeights) m += 1;
  return m <= 1 ? "Low" : m === 2 ? "Medium" : "High";
}

function deployment(alt: Model): Deployment {
  if (!alt.openness.isOpenWeights) return { label: "Managed API", note: "Hosted - no self-hosting required" };
  const v = alt.openness.minVramGb;
  if (v === undefined) return { label: "Self-hosted", note: "Open weights" };
  if (v <= 16) return { label: "Easy", note: `Runs on a single ${v}GB GPU` };
  if (v <= 48) return { label: "Moderate", note: `Single ${v}GB GPU` };
  if (v <= 160) return { label: "Advanced", note: `Multi-GPU (~${v}GB VRAM)` };
  return { label: "Enterprise", note: `Large multi-GPU (~${v}GB VRAM)` };
}

function quickStart(alt: Model): string | null {
  if (!alt.openness.isOpenWeights) return null;
  const rt = alt.openness.runtimes ?? [];
  if (rt.includes("Ollama")) return `ollama run ${alt.id}`;
  if (rt.includes("vLLM")) return `vllm serve ${alt.id}`;
  return null;
}

export function computeAlternatives(base: Model, all: Model[], limit = 8): Alternative[] {
  return all
    .filter((m) => m.id !== base.id && m.deprecation !== "deprecated")
    .map((alt) => {
      const { gains, losses } = explain(base, alt);
      const baseCost = computeCost(base, REFERENCE_WORKLOAD).total;
      const altCost = computeCost(alt, REFERENCE_WORKLOAD).total;
      const savingsPct =
        baseCost > 0 && altCost < baseCost ? Math.round(((baseCost - altCost) / baseCost) * 100) : null;
      return {
        model: alt,
        score: score(base, alt),
        gains,
        losses,
        migration: migrationEffort(base, alt),
        savingsPct,
        deployment: deployment(alt),
        quickStart: quickStart(alt),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
