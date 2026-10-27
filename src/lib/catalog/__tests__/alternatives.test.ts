import { describe, expect, it } from "vitest";
import { findAlternatives } from "../alternatives";
import { buildIndex } from "../group";
import { caps, loadSample, model, provider, TODAY } from "./helpers";

const s = loadSample();
const index = buildIndex(s.models, s.providers, { now: TODAY });
const opus = index.bySlug.get("claude-opus-5-5")!;
const alts = findAlternatives(opus, index);

describe("findAlternatives for Claude Opus 5.5", () => {
  it("never offers the same model outside the cheaper-hosts bucket", () => {
    for (const a of [...alts.sameLab, ...alts.frontier, ...alts.openWeight]) {
      expect(a.model.slug).not.toBe("claude-opus-5-5");
    }
    for (const a of alts.cheaperHosts) expect(a.model.slug).toBe("claude-opus-5-5");
  });

  it("only offers models that are cheaper", () => {
    expect(alts.priced).toBe(true);
    for (const a of [...alts.cheaperHosts, ...alts.sameLab, ...alts.frontier, ...alts.openWeight]) {
      expect(a.saving).not.toBeNull();
      expect(a.saving!).toBeGreaterThan(0);
      expect(a.listing.blended!).toBeLessThan(opus.reference.blended!);
    }
  });

  it("suggests smaller current Anthropic models", () => {
    const slugs = alts.sameLab.map((a) => a.model.slug);
    expect(slugs).toContain("claude-sonnet-5-5");
    expect(slugs).not.toContain("claude-sonnet-4-5");
    expect(alts.sameLab.every((a) => a.model.isCurrent)).toBe(true);
  });

  it("looks across the other frontier labs only", () => {
    expect(alts.frontier.length).toBeGreaterThan(0);
    expect(alts.frontier.every((a) => a.model.tier === "frontier" && a.model.labId !== "anthropic")).toBe(true);
    expect(new Set(alts.frontier.map((a) => a.model.labId)).size).toBeGreaterThan(1);
  });

  it("offers open-weight picks at their cheapest host", () => {
    for (const a of alts.openWeight) {
      expect(a.model.openWeights).toBe(true);
      const cheapest = Math.min(...a.model.listings.filter((l) => l.priced && l.host.kind !== "subscription").map((l) => l.blended!));
      expect(a.listing.blended).toBeCloseTo(cheapest);
    }
  });

  it("reports capability coverage between 0 and 1", () => {
    for (const a of [...alts.sameLab, ...alts.frontier]) {
      expect(a.coverage).toBeGreaterThanOrEqual(0);
      expect(a.coverage).toBeLessThanOrEqual(1);
    }
  });
});

describe("findAlternatives without a price", () => {
  it("falls back to similar models without savings", () => {
    const p = [provider("p", "Some Cloud"), provider("a", "Anthropic", "frontier")];
    const idx = buildIndex(
      [
        model({ id: "1", name: "claude-mystery-1", providerId: "p", input: 0, output: null }),
        model({ id: "2", name: "claude-haiku-5-5", providerId: "a", input: 1, output: 5, releaseDate: "2026-10-07" }),
      ],
      p,
      { now: TODAY },
    );
    const res = findAlternatives(idx.bySlug.get("claude-mystery-1")!, idx);
    expect(res.priced).toBe(false);
    expect(res.cheaperHosts).toEqual([]);
    expect(res.sameLab.map((a) => a.model.slug)).toEqual(["claude-haiku-5-5"]);
    expect(res.sameLab[0].saving).toBeNull();
  });
});

describe("findAlternatives hygiene", () => {
  it("drops candidates that lack most of the target's key capabilities", () => {
    const p = [provider("a", "Anthropic", "frontier"), provider("x", "xAI", "frontier")];
    const idx = buildIndex(
      [
        model({ id: "1", name: "claude-opus-5-5", providerId: "a", input: 4, output: 20, releaseDate: "2026-09-22",
          capabilities: caps("toolCalling", "functionCalling", "vision", "reasoning", "promptCaching") }),
        model({ id: "2", name: "grok-4.7", providerId: "x", input: 2, output: 6, releaseDate: "2026-09-21",
          capabilities: caps("streaming") }),
      ],
      p,
      { now: TODAY },
    );
    expect(findAlternatives(idx.bySlug.get("claude-opus-5-5")!, idx).frontier).toEqual([]);
  });

  it("never suggests a frontier model that only a gateway sells", () => {
    const p = [provider("a", "Anthropic", "frontier"), provider("hub", "AIHubMix"), provider("x", "xAI", "frontier")];
    const idx = buildIndex(
      [
        model({ id: "1", name: "claude-opus-5-5", providerId: "a", input: 4, output: 20, releaseDate: "2026-09-22" }),
        model({ id: "2", name: "gpt-5.4-high", providerId: "hub", input: 2, output: 12, releaseDate: "2026-03-05" }),
        model({ id: "3", name: "grok-4.7", providerId: "x", input: 2, output: 6, releaseDate: "2026-09-21" }),
      ],
      p,
      { now: TODAY },
    );
    const res = findAlternatives(idx.bySlug.get("claude-opus-5-5")!, idx);
    expect(res.frontier.map((a) => a.model.slug)).toEqual(["grok-4-7"]);
  });
});
