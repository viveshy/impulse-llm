/** How a model's capabilities read on the page: modalities, features and reasoning efforts. */
import type { CanonicalModel } from "./types";

type CapabilityModel = Pick<CanonicalModel, "capabilities" | "features" | "modalities" | "reasoningEfforts">;

export const FEATURE_LABEL: Record<string, string> = {
  promptCaching: "Prompt caching",
  pdfInput: "PDF input",
  parallelToolCalls: "Parallel tool calls",
  webSearch: "Built-in web search",
  computerUse: "Computer use",
  adaptiveThinking: "Adaptive thinking",
  audioInput: "Audio input",
  assistantPrefill: "Assistant prefill",
  nativeStructuredOutput: "Native structured output",
  toolSearch: "Tool search",
  videoInput: "Video input",
  thinkingAlwaysOn: "Always reasons",
  audioOutput: "Audio output",
  urlContext: "URL context",
  fastMode: "Fast mode",
};

export const MODALITY_LABEL: Record<string, string> = {
  text: "Text",
  image: "Images",
  audio: "Audio",
  video: "Video",
  pdf: "PDFs",
  embedding: "Embeddings",
};

const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];

/** Modalities as listed, plus what the capability and feature flags imply. */
export function modalitiesOf(model: CapabilityModel): { input: string[]; output: string[] } {
  const has = new Set<string>(model.capabilities);
  const feat = new Set(model.features);
  const input = new Set<string>(model.modalities.input.length ? model.modalities.input : ["text"]);
  const output = new Set<string>(model.modalities.output.length ? model.modalities.output : ["text"]);
  if (has.has("vision") || has.has("imageInput")) input.add("image");
  if (feat.has("audioInput")) input.add("audio");
  if (feat.has("videoInput")) input.add("video");
  if (feat.has("pdfInput")) input.add("pdf");
  if (has.has("imageGeneration")) output.add("image");
  if (feat.has("audioOutput")) output.add("audio");
  return { input: [...input], output: [...output] };
}

export const featureLabels = (model: CapabilityModel) => model.features.map((f) => FEATURE_LABEL[f] ?? f);

export const effortsOf = (model: CapabilityModel) => EFFORT_ORDER.filter((e) => model.reasoningEfforts.includes(e));
