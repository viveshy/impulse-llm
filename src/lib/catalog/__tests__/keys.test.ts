import { describe, expect, it } from "vitest";
import { parseListingName, qualifiedName, routeInfo } from "../keys";

describe("parseListingName", () => {
  const cases: [string, string, Record<string, unknown>?, string?][] = [
    ["claude-opus-5-5", "claude-opus-5-5"],
    ["claude-opus-5.5", "claude-opus-5-5"],
    ["us.anthropic.claude-opus-5-5", "claude-opus-5-5", { region: "us", vendor: "anthropic" }],
    ["us-gov.anthropic.claude-opus-5-5", "claude-opus-5-5", { region: "us-gov" }],
    ["claude-opus-5-5@default", "claude-opus-5-5"],
    ["claude-3-5-sonnet@20240620", "claude-3-5-sonnet", { snapshot: "2024-06-20" }],
    ["anthropic.claude-3-5-sonnet-20241022-v2:0", "claude-3-5-sonnet", { snapshot: "2024-10-22" }],
    ["anthropic.claude-v2:1", "claude-2-1"],
    ["claude-4-sonnet", "claude-sonnet-4"],
    ["claude-3-5-sonnet-latest", "claude-3-5-sonnet", { alias: true }],
    ["claude-opus-5-5-fast", "claude-opus-5-5", { fast: true }],
    ["gpt-6.1-sol", "gpt-6-1-sol"],
    ["gpt-4o-2024-08-06", "gpt-4o", { snapshot: "2024-08-06" }],
    ["ft:gpt-4o-2024-08-06", "gpt-4o", { fineTune: true }],
    ["gpt-35-turbo", "gpt-3-5-turbo"],
    ["gpt-4-0613", "gpt-4"],
    ["grok-4.20-0309-reasoning", "grok-4-20-reasoning"],
    ["gemini-2.5-flash-preview-09-2025", "gemini-2-5-flash-preview", { snapshot: "2025-09" }],
    ["mistral-large-2407", "mistral-large-2407"],
    ["databricks-claude-opus-5-5", "claude-opus-5-5", undefined, "Databricks"],
    ["accounts/fireworks/models/llama-v3p1-8b-instruct", "llama-3-1-8b-instruct", undefined, "Fireworks AI"],
    ["gpt-oss:120b-cloud", "gpt-oss-120b-cloud"],
    ["deepseek-v4.1-flash-1017", "deepseek-v4-1-flash", { snapshot: "1017" }],
    ["qwen3-30b-a3b-instruct-2507", "qwen3-30b-a3b-instruct-2507"],
    ["qwen3-32b-fp8", "qwen3-32b"],
    ["gpt-oss-120b-mxfp4-gguf", "gpt-oss-120b"],
    ["gemma-4-31b-it-nvfp4", "gemma-4-31b-it"],
    ["gpt-4-turbo", "gpt-4-turbo"],
  ];

  for (const [name, key, extra, hostName] of cases) {
    it(`${name} → ${key}`, () => {
      const parsed = parseListingName(name, { hostName });
      expect(parsed.key).toBe(key);
      if (extra) expect(parsed).toMatchObject(extra);
    });
  }

  it("never returns an empty key", () => {
    for (const odd of ["", "  ", "@default", "ft:", "us.", "-v1:0", "accounts/fireworks/models/"]) {
      expect(parseListingName(odd).key.length).toBeGreaterThan(0);
    }
  });

  it("flags default to false", () => {
    expect(parseListingName("gpt-6-sol")).toMatchObject({ fineTune: false, fast: false, alias: false });
  });
});

describe("routeInfo", () => {
  it("reads an azure data-zone region", () => {
    expect(routeInfo("eu")).toMatchObject({ region: "eu", commitment: false });
  });
  it("reads an AWS region", () => {
    expect(routeInfo("us-gov-east-1").region).toBe("us-gov-east-1");
  });
  it("flags provisioned commitments", () => {
    expect(routeInfo("us-east-1-1-month-commitment")).toMatchObject({ commitment: true, region: "us-east-1" });
  });
  it("names deployment types", () => {
    expect(routeInfo("global-standard").deployment).toBe("Global Standard");
  });
  it("ignores vendor org paths", () => {
    const r = routeInfo("qwen");
    expect(r.region).toBeUndefined();
    expect(r.deployment).toBeUndefined();
    expect(r.commitment).toBe(false);
  });
  it("describes image size variants", () => {
    expect(routeInfo("low-1024-x-1024").variant).toBe("low · 1024×1024");
  });
  it("names Bedrock Mantle from the litellm provider", () => {
    expect(routeInfo(undefined, "bedrock_mantle").deployment).toBe("Mantle");
  });
  it("handles no route", () => {
    expect(routeInfo(undefined)).toEqual({ commitment: false });
  });
});

describe("qualifiedName", () => {
  it("puts fal's model path back in front of its leaf name", () => {
    expect(qualifiedName("edit", "openai-gpt-image-2", "fal_ai")).toBe("openai/gpt-image-2-edit");
    expect(qualifiedName("3.2", "bria-text-to-image", "fal_ai")).toBe("bria-text-to-image-3.2");
  });
  it("drops the size and quality variant from the path", () => {
    expect(qualifiedName("edit", "low-1024-x-768-openai-gpt-image-2", "fal_ai")).toBe("openai/gpt-image-2-edit");
  });
  it("does the same for AI/ML API", () => {
    expect(qualifiedName("dev", "flux", "aiml")).toBe("flux-dev");
  });
  it("leaves other hosts alone", () => {
    expect(qualifiedName("gpt-6-sol", "eu", "azure")).toBe("gpt-6-sol");
    expect(qualifiedName("edit", undefined, "fal_ai")).toBe("edit");
  });
});
