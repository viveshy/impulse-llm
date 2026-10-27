import { describe, expect, it } from "vitest";
import type { SearchRow } from "@/lib/catalog/select";
import { rankModels } from "../search";

const row = (s: string, n: string, extra: Partial<SearchRow> = {}): SearchRow => ({
  s,
  l: "lab",
  n,
  k: "chat",
  t: "frontier",
  a: [s],
  ...extra,
});

const rows: SearchRow[] = [
  row("gpt-6-1-sol", "GPT 6.1 Sol"),
  row("o3-mini", "o3 Mini", { a: ["o3-mini-2025-01-31"] }),
  row("llama-5", "Llama 5", { t: "open" }),
  row("claude-opus-5-5", "Claude Opus 5.5", { a: ["claude-opus-5-5", "anthropic.claude-opus-5-5-v1:0"] }),
  row("sora-2", "Sora 2", { k: "video" }),
  row("gpt-image-2", "GPT Image 2", { k: "image" }),
];

describe("rankModels", () => {
  it("shows frontier chat models when the query is empty", () => {
    expect(rankModels(rows, "").map((r) => r.s)).toEqual(["gpt-6-1-sol", "o3-mini", "claude-opus-5-5"]);
  });

  it("puts name prefixes before name matches", () => {
    expect(rankModels(rows, "gpt").map((r) => r.s)).toEqual(["gpt-6-1-sol", "gpt-image-2"]);
    expect(rankModels(rows, "opus").map((r) => r.s)).toEqual(["claude-opus-5-5"]);
  });

  it("ignores spacing and punctuation", () => {
    expect(rankModels(rows, "opus 5.5").map((r) => r.s)).toEqual(["claude-opus-5-5"]);
    expect(rankModels(rows, "gpt-6.1").map((r) => r.s)).toEqual(["gpt-6-1-sol"]);
  });

  it("finds a model by any API id", () => {
    expect(rankModels(rows, "anthropic.claude").map((r) => r.s)).toEqual(["claude-opus-5-5"]);
    expect(rankModels(rows, "2025-01-31").map((r) => r.s)).toEqual(["o3-mini"]);
  });

  it("prefers frontier labs at the same strength of match", () => {
    const mixed = [row("llama-x", "Lx", { t: "open" }), row("gpt-x", "Lx2")];
    expect(rankModels(mixed, "lx").map((r) => r.s)).toEqual(["gpt-x", "llama-x"]);
  });

  it("can be limited to chat models", () => {
    expect(rankModels(rows, "gpt", { kind: "chat" }).map((r) => r.s)).toEqual(["gpt-6-1-sol"]);
  });
});
