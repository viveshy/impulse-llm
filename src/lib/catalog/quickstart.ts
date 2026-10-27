/** Copy-paste snippets for calling a model: the lab's own SDK, LiteLLM, and curl. */
import type { CanonicalModel } from "./types";

export interface Snippet {
  id: string;
  label: string;
  lang: "python" | "typescript" | "bash";
  code: string;
}

/** LiteLLM route prefixes that differ from the catalog's `litellm_provider`. */
const LITELLM_PREFIX: Record<string, string> = {
  bedrock_converse: "bedrock",
  bedrock_mantle: "bedrock",
};

function litellmModel(m: CanonicalModel): string {
  const l = m.reference;
  const provider = l.litellmProvider ?? l.host.slug;
  const prefix = LITELLM_PREFIX[provider] ?? (provider.startsWith("vertex_ai") ? "vertex_ai" : provider);
  return `${prefix}/${l.apiModelId}`;
}

function native(m: CanonicalModel, id: string): Snippet[] {
  switch (m.labId) {
    case "anthropic":
      return [
        {
          id: "anthropic-python",
          label: "Anthropic SDK",
          lang: "python",
          code: `from anthropic import Anthropic

client = Anthropic()  # reads ANTHROPIC_API_KEY

message = client.messages.create(
    model="${id}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(message.content[0].text)`,
        },
        {
          id: "anthropic-curl",
          label: "curl",
          lang: "bash",
          code: `curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model": "${id}", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}'`,
        },
      ];
    case "openai":
      return [
        {
          id: "openai-python",
          label: "OpenAI SDK",
          lang: "python",
          code: `from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY

response = client.responses.create(model="${id}", input="Hello")
print(response.output_text)`,
        },
        {
          id: "openai-curl",
          label: "curl",
          lang: "bash",
          code: `curl https://api.openai.com/v1/responses \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${id}", "input": "Hello"}'`,
        },
      ];
    case "google":
      return [
        {
          id: "google-python",
          label: "Google Gen AI SDK",
          lang: "python",
          code: `from google import genai

client = genai.Client()  # reads GEMINI_API_KEY

response = client.models.generate_content(model="${id}", contents="Hello")
print(response.text)`,
        },
        {
          id: "google-curl",
          label: "curl",
          lang: "bash",
          code: `curl "https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contents": [{"parts": [{"text": "Hello"}]}]}'`,
        },
      ];
    case "xai":
      return [
        {
          id: "xai-python",
          label: "OpenAI SDK (xAI endpoint)",
          lang: "python",
          code: `import os
from openai import OpenAI

client = OpenAI(base_url="https://api.x.ai/v1", api_key=os.environ["XAI_API_KEY"])

completion = client.chat.completions.create(
    model="${id}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(completion.choices[0].message.content)`,
        },
      ];
    default:
      return [];
  }
}

export function quickstartSnippets(m: CanonicalModel): Snippet[] {
  const firstParty = m.labId && m.reference.host.labId === m.labId;
  const id = m.reference.apiModelId;
  return [
    ...(firstParty ? native(m, id) : []),
    {
      id: "litellm",
      label: "LiteLLM",
      lang: "python",
      code: `from litellm import completion

response = completion(
    model="${litellmModel(m)}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)`,
    },
  ];
}
