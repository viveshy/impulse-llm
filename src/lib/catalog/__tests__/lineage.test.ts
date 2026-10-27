import { describe, expect, it } from "vitest";
import { buildIndex } from "../group";
import { compareVersions, lineAndVersion } from "../lineage";
import { loadSample, model, provider, TODAY } from "./helpers";

describe("lineAndVersion", () => {
  const cases: [string, string, number[]][] = [
    ["claude-opus-5-5", "claude-opus", [5, 5]],
    ["claude-3-5-sonnet", "claude-sonnet", [3, 5]],
    ["claude-sonnet-4-5", "claude-sonnet", [4, 5]],
    ["gpt-6-1-sol", "gpt-sol", [6, 1]],
    ["o4-mini", "o-mini", [4]],
    ["kimi-k3", "kimi-k", [3]],
    ["deepseek-v3-2", "deepseek", [3, 2]],
    ["llama-3-1-8b-instruct", "llama-8b-instruct", [3, 1]],
    ["gpt-4o", "gpt-4o", []],
  ];
  for (const [key, line, version] of cases) {
    it(`${key} → ${line} ${version.join(".")}`, () => expect(lineAndVersion(key)).toEqual({ line, version }));
  }

  it("compares versions numerically", () => {
    expect(compareVersions([4, 20], [4, 7])).toBeGreaterThan(0);
    expect(compareVersions([5], [5, 0])).toBe(0);
    expect(compareVersions([3, 5], [4])).toBeLessThan(0);
  });
});

describe("assignLineage on real listings", () => {
  const s = loadSample();
  const index = buildIndex(s.models, s.providers, { now: TODAY });
  const get = (slug: string) => index.bySlug.get(slug)!;

  it("points Sonnet 4.5 and 3.5 at Sonnet 5.5 across word orders", () => {
    expect(get("claude-sonnet-4-5").successorSlug).toBe("claude-sonnet-5-5");
    expect(get("claude-3-5-sonnet").successorSlug).toBe("claude-sonnet-5-5");
    expect(get("claude-sonnet-5-5").isCurrent).toBe(true);
    expect(get("claude-sonnet-5-5").predecessorSlugs).toContain("claude-sonnet-4-5");
  });

  it("points GPT-6 Sol at GPT-6.1 Sol", () => {
    expect(get("gpt-6-sol").successorSlug).toBe("gpt-6-1-sol");
    expect(get("gpt-6-sol").isCurrent).toBe(false);
  });

  it("uses release dates over version numbers (Grok 4.20 came before 4.7)", () => {
    expect(get("grok-4-20").successorSlug).toBe("grok-4-7");
    expect(get("grok-4-7").isCurrent).toBe(true);
  });
});

describe("assignLineage edge cases", () => {
  const p = [provider("p", "Some Cloud")];

  it("never makes a preview the successor of a released model", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "acme-2-pro", providerId: "p", releaseDate: "2026-01-01" }),
        model({ id: "2", name: "acme-3-pro-preview", providerId: "p", releaseDate: "2026-06-01" }),
      ],
      p,
      { now: TODAY },
    );
    expect(idx.bySlug.get("acme-2-pro")!.successorSlug).toBeUndefined();
    expect(idx.bySlug.get("acme-2-pro")!.isCurrent).toBe(true);
  });

  it("does not call a retired model current", () => {
    const idx = buildIndex(
      [model({ id: "1", name: "acme-9", providerId: "p", deprecationDate: "2026-10-01" })],
      p,
      { now: TODAY },
    );
    expect(idx.bySlug.get("acme-9")!.isCurrent).toBe(false);
  });
});
