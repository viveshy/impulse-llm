import { describe, expect, it } from "vitest";
import { buildIndex } from "../group";
import { quickstartSnippets } from "../quickstart";
import { loadSample, TODAY } from "./helpers";

const s = loadSample();
const index = buildIndex(s.models, s.providers, { now: TODAY });

describe("quickstartSnippets", () => {
  it("gives Anthropic models the Anthropic SDK with the API id", () => {
    const snippets = quickstartSnippets(index.bySlug.get("claude-opus-5-5")!);
    const native = snippets.find((x) => x.id === "anthropic-python")!;
    expect(native.code).toContain('model="claude-opus-5-5"');
    expect(native.code).toContain("from anthropic import Anthropic");
  });

  it("gives every model a LiteLLM snippet with the provider prefix", () => {
    const opus = quickstartSnippets(index.bySlug.get("claude-opus-5-5")!).find((x) => x.id === "litellm")!;
    expect(opus.code).toContain('model="anthropic/claude-opus-5-5"');
    const grok = quickstartSnippets(index.bySlug.get("grok-4-7")!).find((x) => x.id === "litellm")!;
    expect(grok.code).toContain('model="xai/grok-4.7"');
  });

  it("uses xAI's OpenAI-compatible endpoint", () => {
    const grok = quickstartSnippets(index.bySlug.get("grok-4-7")!).find((x) => x.id === "xai-python")!;
    expect(grok.code).toContain("https://api.x.ai/v1");
  });
});
