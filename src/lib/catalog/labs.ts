/**
 * The labs that make models. A model's lab comes from a cloud host's vendor prefix
 * (`anthropic.claude-…`), else its name, else the first-party host it is listed on.
 */

export type LabId = string;
export type LabTier = "frontier" | "open" | "other";

export interface Lab {
  id: LabId;
  name: string;
  tier: LabTier;
  website: string;
}

interface LabRule extends Lab {
  /** Matched against a canonical key; first matching lab wins, so order matters. */
  patterns: RegExp[];
  /** Vendor segments clouds put in front of a model id (`anthropic.`, `meta-llama/`). */
  vendors: string[];
  /** Catalog host names that are this lab's own API (fallback for unrecognised names). */
  hosts: string[];
}

const RULES: LabRule[] = [
  {
    id: "openai",
    name: "OpenAI",
    tier: "frontier",
    website: "https://openai.com",
    patterns: [
      /^(gpt|chatgpt|davinci|babbage|dall-e|whisper|tts-|sora|codex|omni-moderation|computer-use)/,
      /^o\d+(-|$)/,
      /^text-embedding-(3|ada)/,
    ],
    vendors: ["openai"],
    hosts: ["OpenAI"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tier: "frontier",
    website: "https://www.anthropic.com",
    patterns: [/^claude/],
    vendors: ["anthropic"],
    hosts: ["Anthropic"],
  },
  {
    id: "google",
    name: "Google",
    tier: "frontier",
    website: "https://ai.google.dev",
    patterns: [
      /^(gemini|gemma|codegemma|paligemma|shieldgemma|imagen|veo|learnlm|nano-banana|lyria|chirp|medlm)/,
      /^text-embedding-(0\d\d|preview|large-exp|gecko)/,
      /^textembedding/,
    ],
    vendors: ["google"],
    hosts: ["Google AI Studio - Gemini"],
  },
  {
    id: "xai",
    name: "xAI",
    tier: "frontier",
    website: "https://x.ai",
    patterns: [/^grok/],
    vendors: ["xai"],
    hosts: ["xAI"],
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    tier: "open",
    website: "https://www.nvidia.com/en-us/ai/",
    patterns: [/nemotron/],
    vendors: ["nvidia"],
    hosts: [],
  },
  {
    id: "meta",
    name: "Meta",
    tier: "open",
    website: "https://www.llama.com",
    patterns: [/^(llama|meta-llama|codellama|muse)/],
    vendors: ["meta", "meta-llama"],
    hosts: ["Meta Model API", "Meta - Llama API"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    tier: "open",
    website: "https://mistral.ai",
    patterns: [
      /^(mistral|mixtral|ministral|magistral|codestral|pixtral|devstral|voxtral|open-mistral|open-mixtral|open-codestral)/,
    ],
    vendors: ["mistral", "mistralai"],
    hosts: ["Mistral AI API", "Codestral", "Text Completion Codestral"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    tier: "open",
    website: "https://www.deepseek.com",
    patterns: [/^deepseek/],
    vendors: ["deepseek", "deepseek-ai"],
    hosts: ["Deepseek"],
  },
  {
    id: "alibaba",
    name: "Alibaba Qwen",
    tier: "open",
    website: "https://qwen.ai",
    patterns: [/^(qwen|qwq|qvq)/],
    vendors: ["qwen", "alibaba"],
    hosts: ["Dashscope", "Qianwen AI Platform", "QwenCloud"],
  },
  {
    id: "moonshot",
    name: "Moonshot AI",
    tier: "open",
    website: "https://www.moonshot.ai",
    patterns: [/^(kimi|moonshot)/],
    vendors: ["moonshot", "moonshotai"],
    hosts: ["Moonshot"],
  },
  {
    id: "zhipu",
    name: "Zhipu AI",
    tier: "open",
    website: "https://z.ai",
    patterns: [/^(glm|chatglm|cogview|cogvideo)/],
    vendors: ["zai", "zai-org", "z-ai", "thudm"],
    hosts: ["Z.AI (Zhipu AI)"],
  },
  {
    id: "minimax",
    name: "MiniMax",
    tier: "open",
    website: "https://www.minimax.io",
    patterns: [/^(minimax|abab)/],
    vendors: ["minimax", "minimaxai"],
    hosts: ["Minimax"],
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    tier: "open",
    website: "https://mimo.xiaomi.com",
    patterns: [/^mimo/],
    vendors: ["xiaomi", "xiaomimimo"],
    hosts: ["Xiaomi Mimo"],
  },
  {
    id: "ibm",
    name: "IBM",
    tier: "open",
    website: "https://www.ibm.com/granite",
    patterns: [/^granite/],
    vendors: ["ibm", "ibm-granite"],
    hosts: [],
  },
  {
    id: "amazon",
    name: "Amazon",
    tier: "other",
    website: "https://aws.amazon.com/ai/generative-ai/nova/",
    patterns: [/^(nova|titan|amazon)/],
    vendors: ["amazon"],
    hosts: ["Amazon Nova"],
  },
  {
    id: "cohere",
    name: "Cohere",
    tier: "other",
    website: "https://cohere.com",
    patterns: [/^(command|c4ai|embed-|rerank-|aya)/],
    vendors: ["cohere"],
    hosts: ["Cohere", "Cohere Chat"],
  },
  {
    id: "ai21",
    name: "AI21 Labs",
    tier: "other",
    website: "https://www.ai21.com",
    patterns: [/^(jamba|j2-|jurassic)/],
    vendors: ["ai21"],
    hosts: ["AI21"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    tier: "other",
    website: "https://www.perplexity.ai",
    patterns: [/^(sonar|pplx|r1-1776)/],
    vendors: ["perplexity"],
    hosts: [],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    tier: "other",
    website: "https://azure.microsoft.com/en-us/products/ai-foundry",
    patterns: [/^(phi|mai-)/],
    vendors: ["microsoft"],
    hosts: [],
  },
  {
    id: "bfl",
    name: "Black Forest Labs",
    tier: "other",
    website: "https://bfl.ai",
    patterns: [/^flux/],
    vendors: ["black-forest-labs"],
    hosts: ["Black Forest Labs"],
  },
];

export const LABS: Lab[] = RULES.map(({ id, name, tier, website }) => ({ id, name, tier, website }));

const BY_ID = new Map(LABS.map((l) => [l.id, l]));

export function labById(id: LabId | null | undefined): Lab | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function labFor(key: string, vendorHint?: string, hostName?: string): LabId | null {
  if (vendorHint) {
    const byVendor = RULES.find((r) => r.vendors.includes(vendorHint));
    if (byVendor) return byVendor.id;
  }
  const byName = RULES.find((r) => r.patterns.some((p) => p.test(key)));
  if (byName) return byName.id;
  if (hostName) {
    const byHost = RULES.find((r) => r.hosts.includes(hostName));
    if (byHost) return byHost.id;
  }
  return null;
}
