import { describe, expect, it } from "vitest";
import { LABS, labById, labFor } from "../labs";

describe("labFor", () => {
  const cases: [string, string | null, string?][] = [
    ["claude-opus-5-5", "anthropic"],
    ["gpt-oss-120b", "openai"],
    ["text-embedding-004", "google"],
    ["text-embedding-3-large", "openai"],
    ["grok-4-7", "xai"],
    ["kimi-k3", "moonshot"],
    ["sonar-pro", "perplexity"],
    ["llama-3-1-8b", "meta"],
    ["some-model", "amazon", "amazon"],
    ["completely-unknown-thing", null],
  ];
  for (const [key, lab, vendor] of cases) {
    it(`${key}${vendor ? ` (vendor ${vendor})` : ""} → ${lab}`, () => expect(labFor(key, vendor)).toBe(lab));
  }

  it("falls back to the first-party host's lab", () => {
    expect(labFor("mystery-1", undefined, "Anthropic")).toBe("anthropic");
  });
});

describe("LABS", () => {
  it("has exactly four frontier labs", () => {
    expect(LABS.filter((l) => l.tier === "frontier").map((l) => l.id).sort()).toEqual(
      ["anthropic", "google", "openai", "xai"],
    );
  });
  it("looks labs up by id", () => {
    expect(labById("google")?.name).toBe("Google");
    expect(labById("nope")).toBeUndefined();
  });
});
