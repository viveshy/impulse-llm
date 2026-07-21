import type { Endpoint, Model, Provider } from "@/lib/domain/types";

export interface ApiExample {
  curl: string;
  response: string;
  python: string;
  typescript: string;
}

type Kind = "chat" | "embeddings" | "image" | "audio" | "moderation" | "generic";

function kindOf(endpoint: Endpoint): Kind {
  const p = `${endpoint.path} ${endpoint.name}`.toLowerCase();
  if (p.includes("embedding")) return "embeddings";
  if (p.includes("image")) return "image";
  if (p.includes("audio") || p.includes("speech")) return "audio";
  if (p.includes("moderation")) return "moderation";
  if (p.includes("chat") || p.includes("response") || p.includes("message") || p.includes("complet"))
    return "chat";
  return "generic";
}

/**
 * The provider's real inference base URL. It is curated data, never derived: guessing
 * `api.<website-host>` produced nonsense like `https://api.docs.litellm.ai`, because
 * LiteLLM's provider url is a documentation link. When we don't know it, say so with an
 * obvious placeholder rather than emitting a plausible-looking URL that doesn't exist.
 */
function apiBase(provider: Provider): string {
  return provider.apiBase || "$API_BASE_URL";
}

/**
 * Join a base with an endpoint path without duplicating the version segment: our paths
 * are normalized to `/v1/...`, while a curated base often already ends in its own
 * version (`https://api.groq.com/openai/v1`).
 */
function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  return `${b}${/\/v\d+[a-z]*$/.test(b) ? path.replace(/^\/v\d+/, "") : path}`;
}

function authHeader(provider: Provider): string {
  return provider.authType === "api-key"
    ? `-H "x-api-key: $API_KEY"`
    : `-H "Authorization: Bearer $API_KEY"`;
}

function bodyFor(kind: Kind, modelId: string): string {
  switch (kind) {
    case "embeddings":
      return `{\n    "model": "${modelId}",\n    "input": "The quick brown fox"\n  }`;
    case "image":
      return `{\n    "model": "${modelId}",\n    "prompt": "A red bicycle on a beach",\n    "size": "1024x1024"\n  }`;
    case "audio":
      return `{\n    "model": "${modelId}",\n    "input": "Hello from Impulse",\n    "voice": "alloy"\n  }`;
    case "moderation":
      return `{\n    "model": "${modelId}",\n    "input": "Text to classify"\n  }`;
    default:
      return `{\n    "model": "${modelId}",\n    "messages": [{ "role": "user", "content": "Hello!" }]\n  }`;
  }
}

function responseFor(kind: Kind, modelId: string): string {
  switch (kind) {
    case "embeddings":
      return `{
  "object": "list",
  "model": "${modelId}",
  "data": [{ "object": "embedding", "index": 0, "embedding": [0.0123, -0.0456, ...] }],
  "usage": { "prompt_tokens": 5, "total_tokens": 5 }
}`;
    case "image":
      return `{
  "created": 1730000000,
  "data": [{ "url": "https://.../generated.png" }]
}`;
    case "audio":
      return `// binary audio stream (audio/mpeg)`;
    case "moderation":
      return `{
  "model": "${modelId}",
  "results": [{ "flagged": false, "categories": { "violence": false } }]
}`;
    default:
      return `{
  "id": "resp_a1b2c3",
  "object": "chat.completion",
  "model": "${modelId}",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Hello! How can I help?" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21 }
}`;
  }
}

export function apiExample(provider: Provider, endpoint: Endpoint, model: Model | null): ApiExample {
  const kind = kindOf(endpoint);
  const modelId = model?.id ?? "model-id";
  const base = apiBase(provider);
  const url = joinUrl(base, endpoint.path);
  const body = bodyFor(kind, modelId);

  const curl = `curl ${url} \\
  ${authHeader(provider)} \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;

  const response = responseFor(kind, modelId);

  const python =
    kind === "embeddings"
      ? `from openai import OpenAI\n\nclient = OpenAI(base_url="${base}")\nresp = client.embeddings.create(\n    model="${modelId}",\n    input="The quick brown fox",\n)\nprint(resp.data[0].embedding)`
      : `from openai import OpenAI\n\nclient = OpenAI(base_url="${base}")\nresp = client.chat.completions.create(\n    model="${modelId}",\n    messages=[{"role": "user", "content": "Hello!"}],\n)\nprint(resp.choices[0].message.content)`;

  const typescript =
    kind === "embeddings"
      ? `import OpenAI from "openai";\n\nconst client = new OpenAI({ baseURL: "${base}" });\nconst resp = await client.embeddings.create({\n  model: "${modelId}",\n  input: "The quick brown fox",\n});\nconsole.log(resp.data[0].embedding);`
      : `import OpenAI from "openai";\n\nconst client = new OpenAI({ baseURL: "${base}" });\nconst resp = await client.chat.completions.create({\n  model: "${modelId}",\n  messages: [{ role: "user", content: "Hello!" }],\n});\nconsole.log(resp.choices[0].message.content);`;

  return { curl, response, python, typescript };
}
