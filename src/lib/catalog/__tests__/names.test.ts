import { describe, expect, it } from "vitest";
import { displayName } from "../names";

describe("displayName", () => {
  const cases: [string, string][] = [
    ["claude-opus-5-5", "Claude Opus 5.5"],
    ["chat", "ChatGPT Latest"],
    ["claude-3-5-sonnet", "Claude 3.5 Sonnet"],
    ["gpt-6-1-sol", "GPT-6.1 Sol"],
    ["gpt-4o-mini", "GPT-4o Mini"],
    ["o3-mini", "o3-mini"],
    ["gemini-3-8-flash", "Gemini 3.8 Flash"],
    ["grok-4-7", "Grok 4.7"],
    ["llama-3-1-8b-instruct", "Llama 3.1 8B Instruct"],
    ["dall-e-3", "DALL·E 3"],
    ["gpt-oss-120b", "gpt-oss-120b"],
    ["deepseek-v3-2", "DeepSeek V3.2"],
    ["grok-4-1-fast-non-reasoning", "Grok 4.1 Fast Non-Reasoning"],
    ["qwen3-8-omni-flash", "Qwen3.8 Omni Flash"],
    ["kimi-k3-1-pro", "Kimi K3.1 Pro"],
    ["minimax-m3-1-flash", "MiniMax M3.1 Flash"],
    ["gemma-4-26b-a4b-it", "Gemma 4 26B A4B IT"],
  ];
  for (const [key, name] of cases) {
    it(`${key} → ${name}`, () => expect(displayName(key)).toBe(name));
  }
});

describe("displayName with keys every object has", () => {
  it("still returns a name, which a link can ask for", () => {
    expect(displayName("constructor")).toBe("Constructor");
    expect(displayName("gpt-constructor")).toBe("GPT Constructor");
    for (const key of ["__proto__", "to-string", "has-own-property", "value-of"]) expect(typeof displayName(key), key).toBe("string");
  });
});
