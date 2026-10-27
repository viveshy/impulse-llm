import { describe, expect, it } from "vitest";
import { buildIndex } from "@/lib/catalog/group";
import { loadSample, TODAY } from "@/lib/catalog/__tests__/helpers";
import {
  canonicalPage,
  cloudHref,
  compareHref,
  hostHref,
  labHref,
  legacyComparePath,
  legacyHostPath,
  legacyModelPath,
  modelHref,
  resolveModelRoute,
} from "../routes";

const { models, providers } = loadSample();
const index = buildIndex(models, providers, { now: TODAY });

describe("routes", () => {
  it("builds canonical hrefs", () => {
    const opus = index.bySlug.get("claude-opus-5-5")!;
    expect(modelHref(opus)).toBe("/models/anthropic/claude-opus-5-5");
    expect(labHref("anthropic")).toBe("/labs/anthropic");
    expect(hostHref("amazon-bedrock")).toBe("/hosts/amazon-bedrock");
    expect(cloudHref("aws")).toBe("/clouds/aws");
    expect(cloudHref("azure", "eu")).toBe("/clouds/azure?zone=eu");
    expect(compareHref([opus, index.bySlug.get("gpt-6-1-sol")!])).toBe(
      "/compare?m=anthropic/claude-opus-5-5,openai/gpt-6-1-sol",
    );
  });

  it("resolves a model under its own lab", () => {
    const r = resolveModelRoute(index, "anthropic", "claude-opus-5-5");
    expect(r && "model" in r && r.model.slug).toBe("claude-opus-5-5");
  });

  it("redirects a model asked for under the wrong lab", () => {
    expect(resolveModelRoute(index, "openai", "claude-opus-5-5")).toEqual({
      redirect: "/models/anthropic/claude-opus-5-5",
    });
  });

  it("returns null for an unknown model", () => {
    expect(resolveModelRoute(index, "x", "unknown")).toBeNull();
  });

  it("accepts percent-encoded and upper-case segments", () => {
    const r = resolveModelRoute(index, "Anthropic", "Claude%2Dopus-5-5");
    expect(r && "model" in r && r.model.slug).toBe("claude-opus-5-5");
  });
});

describe("old /app links", () => {
  it("sends a model's old id to its page", () => {
    const opus = index.bySlug.get("claude-opus-5-5")!;
    for (const l of opus.listings.slice(0, 3)) expect(legacyModelPath(index, l.id)).toBe("/models/anthropic/claude-opus-5-5");
  });

  it("sends a provider's old id to its host page", () => {
    const bedrock = index.hosts.find((h) => h.slug === "amazon-bedrock")!;
    expect(legacyHostPath(index, bedrock.id)).toBe("/hosts/amazon-bedrock");
  });

  it("falls back to the directory for ids it no longer knows", () => {
    expect(legacyModelPath(index, "00000000-dead-beef")).toBe("/models");
    expect(legacyHostPath(index, "nope")).toBe("/hosts");
  });

  it("turns an old compare link's listing ids into the models to compare", () => {
    const opus = index.bySlug.get("claude-opus-5-5")!;
    const sol = index.bySlug.get("gpt-6-1-sol")!;
    const ids = [opus.listings[0].id, "gone", opus.listings[1].id, ` ${sol.listings[0].id}`].join(",");
    expect(legacyComparePath(index, ids)).toBe("/compare?m=anthropic/claude-opus-5-5,openai/gpt-6-1-sol");
    expect(legacyComparePath(index, "gone")).toBe("/compare");
    expect(legacyComparePath(index, null)).toBe("/compare");
  });
});

describe("canonicalPage", () => {
  it("gives the canonical path of a page that exists", () => {
    for (const p of ["/", "/models", "/calculator", "/compare", "/retiring", "/stats", "/watchlist", "/clouds"]) {
      expect(canonicalPage(index, p)).toBe(p);
    }
    expect(canonicalPage(index, "/models/anthropic/claude-opus-5-5")).toBe("/models/anthropic/claude-opus-5-5");
    expect(canonicalPage(index, "/models/Anthropic/Claude%2Dopus-5-5")).toBe("/models/anthropic/claude-opus-5-5");
    expect(canonicalPage(index, "/labs/anthropic")).toBe("/labs/anthropic");
    expect(canonicalPage(index, "/hosts/Amazon-Bedrock")).toBe("/hosts/amazon-bedrock");
    expect(canonicalPage(index, "/clouds/AWS")).toBe("/clouds/aws");
    expect(canonicalPage(index, "/clouds/google-cloud")).toBe("/clouds/google-cloud");
  });

  it("gives null for anything else", () => {
    for (const p of [
      "",
      "models",
      "/nope",
      "/models/",
      "/models?q=claude",
      "/models/anthropic/unknown",
      "/models/openai/claude-opus-5-5", // the wrong lab redirects; the view lands on the right one
      "/models/anthropic/claude-opus-5-5/extra",
      "/labs/nope",
      "/labs/%ZZ",
      "/hosts/nope",
      "/clouds/nope",
      "/clouds/aws/extra",
      "/releases/feed.xml",
      "/api/v",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
    ]) {
      expect(canonicalPage(index, p), JSON.stringify(p)).toBeNull();
    }
  });
});
