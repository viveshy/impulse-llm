import { describe, expect, it } from "vitest";
import type { PriceChange } from "@/lib/domain/types";
import { listingMoves, priceMoves } from "../changes";
import { hostLabel } from "../detail";
import { buildIndex } from "../group";
import { model, provider, TODAY } from "./helpers";

const providers = [
  provider("p-oai", "OpenAI", "frontier"),
  provider("p-tog", "Together AI", "inference"),
  provider("p-gh", "GitHub Copilot", "cloud"),
];
const index = buildIndex(
  [
    model({ id: "l-gpt", name: "gpt-6.1-sol", providerId: "p-oai", input: 1.25, output: 10 }),
    model({ id: "l-kimi", name: "moonshotai/Kimi-K3", providerId: "p-tog", input: 3, output: 15 }),
    model({ id: "l-kimi-2", name: "Kimi-K3", providerId: "p-tog", input: 3, output: 15 }),
    model({ id: "l-gh", name: "gpt-6.1-sol", providerId: "p-gh", input: 1.25, output: 10 }),
  ],
  providers,
  { now: TODAY },
);

const change = (
  listingId: string,
  from: [number | null, number | null],
  to: [number | null, number | null],
  at: string,
): PriceChange => ({
  listingId,
  name: listingId,
  host: { id: "x", name: "x" },
  from: { inputPerMTok: from[0], outputPerMTok: from[1] },
  to: { inputPerMTok: to[0], outputPerMTok: to[1] },
  at: `${at}T06:40:00+00:00`,
});

describe("priceMoves", () => {
  it("reports a cut with its blended change", () => {
    const [m] = priceMoves([change("l-gpt", [2.5, 20], [1.25, 10], "2026-10-20")], index);
    expect(m.model.slug).toBe("gpt-6-1-sol");
    expect(m.listing.host.name).toBe("OpenAI");
    expect(m.change).toBeCloseTo(-0.5);
    expect(m.at).toBe("2026-10-20");
  });

  it("ignores a listing that just got its first price", () => {
    expect(priceMoves([change("l-gpt", [0, 0], [1.25, 10], "2026-10-20")], index)).toEqual([]);
    expect(priceMoves([change("l-gpt", [null, null], [1.25, 10], "2026-10-20")], index)).toEqual([]);
  });

  it("ignores subscription hosts", () => {
    expect(priceMoves([change("l-gh", [2.5, 20], [1.25, 10], "2026-10-20")], index)).toEqual([]);
  });

  it("treats a price dropping to zero as missing data", () => {
    expect(priceMoves([change("l-gpt", [1.25, 10], [1.25, 0], "2026-10-20")], index)).toEqual([]);
  });

  it("nets out a price that went down and back up", () => {
    const moves = priceMoves(
      [change("l-kimi", [3, 15], [2.7, 13.5], "2026-10-06"), change("l-kimi", [2.7, 13.5], [3, 15], "2026-10-13")],
      index,
    );
    expect(moves).toEqual([]);
  });

  it("keeps the net move across several changes", () => {
    const [m] = priceMoves(
      [change("l-kimi", [3, 15], [2.7, 13.5], "2026-10-06"), change("l-kimi", [2.7, 13.5], [2.4, 12], "2026-10-13")],
      index,
    );
    expect(m.from).toEqual({ input: 3, output: 15 });
    expect(m.to).toEqual({ input: 2.4, output: 12 });
    expect(m.at).toBe("2026-10-13");
  });

  it("shows one move per model and host", () => {
    const moves = priceMoves(
      [change("l-kimi", [3, 15], [2.4, 12], "2026-10-13"), change("l-kimi-2", [3, 15], [2.4, 12], "2026-10-12")],
      index,
    );
    expect(moves).toHaveLength(1);
  });

  it("skips listings the catalog no longer has", () => {
    expect(priceMoves([change("gone", [2, 8], [1, 4], "2026-10-20")], index)).toEqual([]);
  });

  it("lists the newest first", () => {
    const moves = priceMoves(
      [change("l-kimi", [3, 15], [2.4, 12], "2026-10-01"), change("l-gpt", [2.5, 20], [1.25, 10], "2026-10-20")],
      index,
    );
    expect(moves.map((m) => m.at)).toEqual(["2026-10-20", "2026-10-01"]);
  });
});

describe("priceMoves at a host with regional listings", () => {
  const idx = buildIndex(
    [
      model({ id: "l-bed", name: "openai.gpt-6.1-sol", providerId: "p-bed", litellmProvider: "bedrock_mantle", input: 1.25, output: 10 }),
      model({ id: "l-gov", name: "openai.gpt-6.1-sol", providerId: "p-bed", litellmProvider: "bedrock_mantle", route: "us-gov-west-1", input: 1.5, output: 12 }),
    ],
    [provider("p-bed", "AWS - Bedrock")],
    { now: TODAY },
  );

  it("names the region when only a regional listing moved", () => {
    const [m] = priceMoves([change("l-gov", [1.4, 11], [1.5, 12], "2026-10-07")], idx);
    expect(hostLabel(m.listing)).toBe("Amazon Bedrock (us-gov-west-1, Mantle)");
  });

  it("shows the host's main listing when it moved too", () => {
    const moves = priceMoves(
      [change("l-bed", [2.5, 20], [1.25, 10], "2026-10-05"), change("l-gov", [1.4, 11], [1.5, 12], "2026-10-07")],
      idx,
    );
    expect(moves.map((m) => [m.listing.id, hostLabel(m.listing)])).toEqual([["l-bed", "Amazon Bedrock (Mantle)"]]);
  });
});

describe("listingMoves", () => {
  it("nets each listing's changes by its id, with the same rules as priceMoves", () => {
    const moves = listingMoves([
      change("l-kimi", [3, 15], [2.7, 13.5], "2026-10-06"),
      change("l-kimi", [2.7, 13.5], [2.4, 12], "2026-10-13"),
      change("l-gpt", [0, 0], [1.25, 10], "2026-10-20"),
      change("l-gh", [2.5, 20], [1.25, 10], "2026-10-20"),
    ]);
    expect([...moves.keys()]).toEqual(["l-kimi", "l-gh"]);
    expect(moves.get("l-kimi")).toMatchObject({ from: { input: 3, output: 15 }, to: { input: 2.4, output: 12 }, at: "2026-10-13" });
    expect(moves.get("l-kimi")!.change).toBeCloseTo(-0.2);
  });
});
