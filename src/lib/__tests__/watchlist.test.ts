import { describe, expect, it } from "vitest";
import { watchlistHref } from "@/lib/routes";
import { MAX_WATCH, parseWatchParam, pinOf, watchParam } from "@/lib/watchlist";

describe("watchlist links", () => {
  it("reads models on hosts, pinned or not", () => {
    expect(parseWatchParam("claude-sonnet-4-5@amazon-bedrock~1a2b3c4d5e6f,gpt-5@openai")).toEqual([
      { model: "claude-sonnet-4-5", host: "amazon-bedrock", pin: "1a2b3c4d5e6f" },
      { model: "gpt-5", host: "openai" },
    ]);
  });

  it("drops entries it can't read and collapses repeats", () => {
    expect(parseWatchParam(" GPT-5@OpenAI ,gpt-5@openai,,nohost,@openai,gpt-5@,a@b~xyz,a@b c")).toEqual([
      { model: "gpt-5", host: "openai" },
    ]);
  });

  it("keeps a pinned and an unpinned entry for the same model and host apart", () => {
    expect(parseWatchParam("gpt-4o@openai,gpt-4o@openai~0123456789ab")).toHaveLength(2);
  });

  it("accepts the parameter repeated", () => {
    expect(parseWatchParam(["gpt-5@openai", "o3@azure-openai"])).toHaveLength(2);
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: MAX_WATCH + 5 }, (_, i) => `m${i}@openai`).join(",");
    expect(parseWatchParam(many)).toHaveLength(MAX_WATCH);
  });

  it("writes what it reads", () => {
    const raw = "claude-sonnet-4-5@amazon-bedrock~1a2b3c4d5e6f,gpt-5@openai";
    expect(watchParam(parseWatchParam(raw))).toBe(raw);
    expect(watchlistHref(parseWatchParam(raw))).toBe(`/watchlist?w=${raw}`);
    expect(watchlistHref([])).toBe("/watchlist");
  });

  it("pins a listing by the first 12 hex digits of its id", () => {
    expect(pinOf("3CA1D63B-af70-569a-a573-a0ddb930e809")).toBe("3ca1d63baf70");
  });
});
