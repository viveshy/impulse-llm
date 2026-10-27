import { describe, expect, it } from "vitest";
import { buildIndex } from "@/lib/catalog/group";
import { loadSample, TODAY } from "@/lib/catalog/__tests__/helpers";
import { bestIndices, MAX_COMPARE, parseCompareParam } from "../compare";

const { models, providers } = loadSample();
const index = buildIndex(models, providers, { now: TODAY });
const slugs = (raw: Parameters<typeof parseCompareParam>[1]) => parseCompareParam(index, raw).map((m) => m.slug);

describe("parseCompareParam", () => {
  it("reads lab/model pairs in order", () => {
    expect(slugs("anthropic/claude-opus-5-5,openai/gpt-6-1-sol")).toEqual(["claude-opus-5-5", "gpt-6-1-sol"]);
  });

  it("accepts bare slugs, a wrong lab, odd case and stray spaces", () => {
    expect(slugs(" Claude-Opus-5-5 , google/gpt-6-1-sol ")).toEqual(["claude-opus-5-5", "gpt-6-1-sol"]);
  });

  it("drops unknown models and repeats", () => {
    expect(slugs("anthropic/nope,anthropic/claude-opus-5-5,claude-opus-5-5,,")).toEqual(["claude-opus-5-5"]);
  });

  it("keeps at most four", () => {
    const five = "claude-opus-5-5,gpt-6-1-sol,gemini-4-argon,grok-4-7,claude-haiku-5-5";
    expect(MAX_COMPARE).toBe(4);
    expect(slugs(five)).toEqual(["claude-opus-5-5", "gpt-6-1-sol", "gemini-4-argon", "grok-4-7"]);
  });

  it("joins a repeated parameter and handles none", () => {
    expect(slugs(["claude-opus-5-5", "grok-4-7"])).toEqual(["claude-opus-5-5", "grok-4-7"]);
    expect(slugs(undefined)).toEqual([]);
  });
});

describe("bestIndices", () => {
  it("marks the lowest when lower is better", () => {
    expect([...bestIndices([4, 2, null, 2], "low")]).toEqual([1, 3]);
  });

  it("marks the highest when higher is better", () => {
    expect([...bestIndices([200_000, 1_000_000, 922_000], "high")]).toEqual([1]);
  });

  it("marks nothing when fewer than two values are known or all tie", () => {
    expect(bestIndices([5, null, undefined], "low").size).toBe(0);
    expect(bestIndices([3, 3], "low").size).toBe(0);
  });
});
