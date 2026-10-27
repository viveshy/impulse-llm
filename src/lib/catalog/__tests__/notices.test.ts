import { describe, expect, it } from "vitest";
import { buildIndex } from "../group";
import { hostInfo } from "../hosts";
import { NOTICE_PAGES, NOTICES } from "../notices";
import { retiring } from "../select";
import type { CatalogIndex } from "../types";
import { model, provider, TODAY } from "./helpers";

const p = [
  provider("v", "Google - Vertex AI"),
  provider("o", "OpenAI", "frontier"),
  provider("b", "AWS - Bedrock"),
];
const listing = (idx: CatalogIndex, slug: string, id: string) => idx.bySlug.get(slug)!.listings.find((l) => l.id === id)!;
const ISO_DAY = /^\d{4}-\d\d-\d\d$/;

describe("checked retirement notices", () => {
  it("corrects a date the host's own notice contradicts, and keeps an earliest date off the retiring list", () => {
    const idx = buildIndex(
      [model({ id: "1", name: "claude-haiku-4-5", providerId: "v", deprecationDate: "2026-10-15", deprecation: "deprecated" })],
      p,
      { now: TODAY },
    );
    expect(listing(idx, "claude-haiku-4-5", "1")).toMatchObject({ deprecationDate: "2026-12-07", notBefore: true, status: "active" });
    expect(retiring(idx, { fromDays: -60, toDays: 365 })).toEqual([]);
  });

  it("steps aside once the source reports something else", () => {
    const idx = buildIndex([model({ id: "1", name: "claude-haiku-4-5", providerId: "v", deprecationDate: "2027-01-31" })], p, {
      now: TODAY,
    });
    expect(listing(idx, "claude-haiku-4-5", "1")).toMatchObject({ deprecationDate: "2027-01-31", notBefore: false });
  });

  it("fills in a date the source leaves off an alias", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "gpt-5", providerId: "o" }),
        model({ id: "2", name: "gpt-5-2025-08-07", providerId: "o", deprecationDate: "2026-12-11" }),
      ],
      p,
      { now: TODAY },
    );
    expect(listing(idx, "gpt-5", "1")).toMatchObject({ deprecationDate: "2026-12-11", status: "deprecating" });
    expect(retiring(idx, { fromDays: 0, toDays: 365 }).map((i) => i.hosts)).toEqual([
      [{ host: "OpenAI", date: "2026-12-11", byLab: true }],
    ]);
  });

  it("can be limited to the listing outside any region", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "claude-sonnet-4-5-20250929-v1:0", providerId: "b" }),
        model({ id: "2", name: "claude-sonnet-4-5-20250929-v1:0", providerId: "b", route: "us-gov-west-1" }),
      ],
      p,
      { now: TODAY },
    );
    expect(listing(idx, "claude-sonnet-4-5", "1").deprecationDate).toBe("2027-04-08");
    expect(listing(idx, "claude-sonnet-4-5", "2").deprecationDate).toBeUndefined();
  });

  it("cites the host's own page and the day it was checked, for every entry", () => {
    const hosts = ["OpenAI", "Anthropic", "Google AI Studio - Gemini", "Google - Vertex AI", "Azure", "Azure AI", "AWS - Bedrock"].map(
      (n) => hostInfo(n, "cloud").slug,
    );
    for (const n of NOTICES) {
      expect(hosts).toContain(n.host);
      expect(n.ids.length).toBeGreaterThan(0);
      expect(n.source).toMatch(/^https:\/\//);
      expect(n.checked).toMatch(ISO_DAY);
      for (const d of [n.reported, n.date]) if (d !== null) expect(d).toMatch(ISO_DAY);
      // each entry changes the date, or marks it as the earliest the host may retire the model
      expect(n.notBefore || n.reported !== n.date).toBe(true);
    }
    for (const page of NOTICE_PAGES) {
      for (const host of page.hosts) expect(hosts).toContain(host);
      expect(page.url).toMatch(/^https:\/\//);
    }
  });
});
