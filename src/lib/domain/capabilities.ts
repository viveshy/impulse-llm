import type { CapabilityKey } from "./types";

/** Full, human-readable label for each capability. */
export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  streaming: "Streaming",
  functionCalling: "Function calling",
  toolCalling: "Tool calling",
  jsonMode: "JSON mode",
  structuredOutputs: "Structured outputs",
  reasoning: "Reasoning",
  vision: "Vision",
  audio: "Audio",
  imageInput: "Image input",
  imageGeneration: "Image generation",
  video: "Video",
  embeddings: "Embeddings",
  batchApi: "Batch API",
  promptCaching: "Prompt caching",
  mcp: "MCP",
};

/** Compact label for dense contexts (rows, cards). */
export const CAPABILITY_SHORT: Record<CapabilityKey, string> = {
  streaming: "Stream",
  functionCalling: "Functions",
  toolCalling: "Tools",
  jsonMode: "JSON",
  structuredOutputs: "Structured",
  reasoning: "Reasoning",
  vision: "Vision",
  audio: "Audio",
  imageInput: "Image in",
  imageGeneration: "Image gen",
  video: "Video",
  embeddings: "Embeddings",
  batchApi: "Batch",
  promptCaching: "Caching",
  mcp: "MCP",
};

/** Grouping used by the capabilities checklist on the model detail page. */
export const CAPABILITY_GROUPS: { label: string; keys: CapabilityKey[] }[] = [
  {
    label: "Core",
    keys: ["streaming", "functionCalling", "jsonMode", "structuredOutputs"],
  },
  {
    label: "Multimodal",
    keys: ["vision", "imageInput", "audio", "imageGeneration", "video"],
  },
  {
    label: "Advanced",
    keys: ["reasoning", "toolCalling", "mcp", "promptCaching", "batchApi", "embeddings"],
  },
];

/**
 * Capabilities surfaced (in priority order) as compact badges on cards/rows.
 * Kept short so a dense row shows the few that matter for a build decision.
 */
export const BADGE_PRIORITY: CapabilityKey[] = [
  "reasoning",
  "vision",
  "toolCalling",
  "audio",
  "imageGeneration",
  "video",
  "embeddings",
  "jsonMode",
  "mcp",
];

/** One-line description of each capability (used on the Capability explorer). */
export const CAPABILITY_DESC: Record<CapabilityKey, string> = {
  streaming: "Token-by-token responses streamed as they generate.",
  functionCalling: "Call developer-defined functions from the model.",
  toolCalling: "Invoke tools and take agentic actions.",
  jsonMode: "Constrain output to valid JSON.",
  structuredOutputs: "Return responses matching a supplied schema.",
  reasoning: "Extended step-by-step reasoning before answering.",
  vision: "Understand and reason over images.",
  audio: "Accept and process audio input.",
  imageInput: "Accept images as part of the prompt.",
  imageGeneration: "Generate images from text.",
  video: "Understand and reason over video.",
  embeddings: "Produce vector embeddings for search and RAG.",
  batchApi: "Process large jobs asynchronously at lower cost.",
  promptCaching: "Cache prompt prefixes to cut latency and cost.",
  mcp: "Native Model Context Protocol support.",
};
