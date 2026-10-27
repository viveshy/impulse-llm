/**
 * Where a model can be called from. The catalog names hosts after LiteLLM's provider
 * docs ("AWS - Bedrock"); this gives them readable names and a kind, which decides how
 * a listing is treated (a subscription price is never a per-token price option).
 */
import type { ProviderCategory } from "@/lib/domain/types";
import type { LabId } from "./labs";
import { slugify } from "./text";

export type HostKind = "first-party" | "cloud" | "inference" | "gateway" | "subscription" | "local";

export interface HostInfo {
  slug: string;
  name: string;
  kind: HostKind;
  /** The lab whose own platform this is (its models count as first-party here). */
  labId?: LabId;
  /** In the registry below: a host we know, not a long-tail reseller. */
  known: boolean;
}

type Entry = { name?: string; kind: HostKind; labId?: LabId };

const REGISTRY: Record<string, Entry> = {
  // labs' own APIs
  OpenAI: { kind: "first-party", labId: "openai" },
  Anthropic: { kind: "first-party", labId: "anthropic" },
  "Google AI Studio - Gemini": { name: "Google AI Studio", kind: "first-party", labId: "google" },
  xAI: { kind: "first-party", labId: "xai" },
  "Mistral AI API": { name: "Mistral AI", kind: "first-party", labId: "mistral" },
  Codestral: { name: "Mistral Codestral", kind: "first-party", labId: "mistral" },
  "Text Completion Codestral": { name: "Mistral Codestral FIM", kind: "first-party", labId: "mistral" },
  Deepseek: { name: "DeepSeek", kind: "first-party", labId: "deepseek" },
  Cohere: { kind: "first-party", labId: "cohere" },
  "Cohere Chat": { name: "Cohere Chat", kind: "first-party", labId: "cohere" },
  Moonshot: { name: "Moonshot AI", kind: "first-party", labId: "moonshot" },
  Minimax: { name: "MiniMax", kind: "first-party", labId: "minimax" },
  "Z.AI (Zhipu AI)": { name: "Z.ai", kind: "first-party", labId: "zhipu" },
  Dashscope: { name: "Alibaba DashScope", kind: "first-party", labId: "alibaba" },
  "Qianwen AI Platform": { name: "Qianwen AI Platform", kind: "first-party", labId: "alibaba" },
  QwenCloud: { name: "Qwen Cloud", kind: "first-party", labId: "alibaba" },
  "Meta Model API": { name: "Meta Model API", kind: "first-party", labId: "meta" },
  "Meta - Llama API": { name: "Llama API", kind: "first-party", labId: "meta" },
  AI21: { name: "AI21 Studio", kind: "first-party", labId: "ai21" },
  "Amazon Nova": { name: "Amazon Nova", kind: "first-party", labId: "amazon" },
  "Xiaomi Mimo": { name: "Xiaomi MiMo", kind: "first-party", labId: "xiaomi" },
  "Black Forest Labs": { kind: "first-party", labId: "bfl" },
  // Perplexity resells other labs' models next to its own Sonar models.
  "Perplexity AI": { name: "Perplexity", kind: "gateway", labId: "perplexity" },

  // hyperscalers and data platforms
  "AWS - Bedrock": { name: "Amazon Bedrock", kind: "cloud", labId: "amazon" },
  "AWS - Sagemaker": { name: "Amazon SageMaker", kind: "cloud" },
  Azure: { name: "Azure OpenAI", kind: "cloud" },
  "Azure AI": { name: "Azure AI Foundry", kind: "cloud", labId: "microsoft" },
  "Azure Text": { name: "Azure AI Language", kind: "cloud" },
  "Google - Vertex AI": { name: "Vertex AI", kind: "cloud", labId: "google" },
  OCI: { name: "Oracle OCI", kind: "cloud" },
  "IBM - Watsonx.ai": { name: "IBM watsonx.ai", kind: "cloud", labId: "ibm" },
  Databricks: { kind: "cloud" },
  Snowflake: { kind: "cloud" },
  "Cloudflare AI Workers": { name: "Cloudflare Workers AI", kind: "cloud" },
  Heroku: { kind: "cloud" },
  Scaleway: { kind: "cloud" },
  "OVHCloud AI Endpoints": { name: "OVHcloud AI Endpoints", kind: "cloud" },
  Volcengine: { kind: "cloud" },
  "Tencent TokenHub": { kind: "cloud" },

  // inference specialists
  "Fireworks AI": { kind: "inference" },
  "Together AI": { kind: "inference" },
  "Groq AI": { name: "Groq", kind: "inference" },
  Cerebras: { kind: "inference" },
  Replicate: { kind: "inference" },
  "Nvidia NIM": { name: "NVIDIA NIM", kind: "inference", labId: "nvidia" },
  DeepInfra: { kind: "inference" },
  "Novita AI": { kind: "inference" },
  Baseten: { kind: "inference" },
  "Nebius AI Studio": { name: "Nebius AI Studio", kind: "inference" },
  "Lambda AI": { kind: "inference" },
  Crusoe: { kind: "inference" },
  "GMI Cloud": { kind: "inference" },
  Nscale: { kind: "inference" },
  Hyperbolic: { kind: "inference" },
  Sambanova: { name: "SambaNova", kind: "inference" },
  FriendliAI: { kind: "inference" },
  "Featherless AI": { kind: "inference" },
  "WandB Inference": { name: "W&B Inference", kind: "inference" },
  "Fal AI": { name: "fal", kind: "inference" },

  // routers and resellers
  "Vercel AI Gateway": { kind: "gateway" },
  AIHubMix: { kind: "gateway" },
  "AI/ML API": { kind: "gateway" },
  LlamaGate: { kind: "gateway" },
  "Inference APIs": { kind: "gateway" },
  "Opencode Go": { name: "OpenCode Go", kind: "gateway" },

  // flat-fee plans: their per-token figures are not prices you pay
  "GitHub Copilot": { kind: "subscription" },
  "ChatGPT Subscription": { name: "ChatGPT", kind: "subscription" },
  "Microsoft 365 Copilot": { kind: "subscription" },

  // run it yourself
  Ollama: { kind: "local" },
  Lemonade: { kind: "local" },
};

const BY_CATEGORY: Record<ProviderCategory, HostKind> = {
  frontier: "first-party",
  open: "first-party",
  inference: "inference",
  cloud: "cloud",
};

export function hostInfo(apiName: string, category: ProviderCategory): HostInfo {
  const entry = REGISTRY[apiName];
  const name = entry?.name ?? apiName;
  return {
    slug: slugify(name),
    name,
    kind: entry?.kind ?? BY_CATEGORY[category] ?? "cloud",
    known: !!entry,
    ...(entry?.labId ? { labId: entry.labId } : {}),
  };
}

export const HOST_KIND_LABEL: Record<HostKind, string> = {
  "first-party": "Lab API",
  cloud: "Cloud",
  inference: "Inference",
  gateway: "Gateway",
  subscription: "Subscription",
  local: "Local",
};
