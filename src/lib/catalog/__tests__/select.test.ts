import { describe, expect, it } from "vitest";
import { buildIndex } from "../group";
import {
  filterModels,
  frontierLineup,
  hostRetirements,
  liveSuccessor,
  nextRetirement,
  releaseRadar,
  retirementLabel,
  retirementScope,
  retiring,
} from "../select";
import { loadSample, model, provider, TODAY } from "./helpers";

const s = loadSample();
const index = buildIndex(s.models, s.providers, { now: TODAY });

describe("releaseRadar", () => {
  it("shows recent frontier releases newest first, without open-weight models", () => {
    const radar = releaseRadar(index, { days: 60, tier: "frontier" });
    const slugs = radar.map((m) => m.slug);
    expect(slugs).toContain("gemini-4-argon");
    expect(slugs).toContain("claude-opus-5-5");
    expect(radar.every((m) => m.tier === "frontier")).toBe(true);
    const dates = radar.map((m) => m.releaseDate!);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(radar.every((m) => m.releaseDate! >= "2026-08-27")).toBe(true);
  });
});

describe("frontierLineup", () => {
  it("lists current frontier models per lab, newest first", () => {
    const lineup = frontierLineup(index, 4);
    const anthropic = lineup.find((g) => g.lab.id === "anthropic")!;
    expect(anthropic.models.length).toBeLessThanOrEqual(4);
    expect(anthropic.models.map((m) => m.slug)).toContain("claude-opus-5-5");
    expect(anthropic.models.every((m) => m.isCurrent)).toBe(true);
    expect(lineup.map((g) => g.lab.id).sort()).toEqual(["anthropic", "google", "openai", "xai"]);
  });
});

describe("retiring", () => {
  const p = [provider("p1", "Anthropic", "frontier"), provider("p2", "AWS - Bedrock")];
  const idx = buildIndex(
    [
      model({ id: "1", name: "claude-opus-4-1", providerId: "p1", deprecationDate: "2026-12-01", releaseDate: "2025-08-05" }),
      model({ id: "2", name: "anthropic.claude-opus-4-1", providerId: "p2", deprecationDate: "2026-11-15" }),
      model({ id: "3", name: "claude-opus-5-5", providerId: "p1", releaseDate: "2026-09-22", input: 4, output: 20 }),
      model({ id: "4", name: "claude-haiku-4-5", providerId: "p1", deprecationDate: "2027-06-01", releaseDate: "2025-10-15" }),
    ],
    p,
    { now: TODAY },
  );

  it("lists the earliest upcoming date, each host with its own date, and the successor", () => {
    const items = retiring(idx, { fromDays: -30, toDays: 120 });
    expect(items.map((i) => i.model.slug)).toEqual(["claude-opus-4-1"]);
    expect(items[0].date).toBe("2026-11-15");
    expect(items[0].daysLeft).toBe(20);
    expect(items[0].hosts).toEqual([
      { host: "Amazon Bedrock", date: "2026-11-15", byLab: false },
      { host: "Anthropic", date: "2026-12-01", byLab: true },
    ]);
    expect(items[0].successor?.slug).toBe("claude-opus-5-5");
  });

  it("can leave out retirements that only affect subscription plans", () => {
    const withCopilot = buildIndex(
      [
        model({ id: "1", name: "claude-opus-4-1", providerId: "p1", releaseDate: "2025-08-05" }),
        model({ id: "2", name: "claude-opus-4-1", providerId: "p-gh", deprecationDate: "2026-11-15" }),
      ],
      [...p, provider("p-gh", "GitHub Copilot")],
      { now: TODAY },
    );
    expect(retiring(withCopilot, { fromDays: 0, toDays: 90 }).map((i) => i.hosts.map((h) => h.host))).toEqual([
      ["GitHub Copilot"],
    ]);
    expect(retiring(withCopilot, { fromDays: 0, toDays: 90, apiOnly: true })).toEqual([]);
  });
});

describe("hostRetirements", () => {
  const p = [provider("o", "OpenAI", "frontier"), provider("az", "Azure"), provider("b", "AWS - Bedrock")];
  const idx = buildIndex(
    [
      model({ id: "1", name: "gpt-4o", providerId: "o" }),
      model({ id: "2", name: "ft:gpt-4o-2024-08-06", providerId: "o", deprecationDate: "2026-11-10" }),
      model({ id: "3", name: "gpt-4o-2024-05-13", providerId: "o", deprecationDate: "2026-11-20" }),
      model({ id: "4", name: "o3-mini", providerId: "az", deprecationDate: "2026-11-19" }),
      model({ id: "5", name: "o3-mini", providerId: "az", route: "eu", deprecationDate: "2026-11-19" }),
      model({ id: "6", name: "o3-mini", providerId: "az", route: "us-gov" }),
      model({ id: "7", name: "claude-sonnet-4-5", providerId: "b", route: "claude-platform", deprecationDate: "2026-11-30" }),
      model({ id: "8", name: "anthropic.claude-sonnet-4-5-20250929-v1:0", providerId: "b", deprecationDate: "2027-04-08" }),
    ],
    p,
    { now: TODAY },
  );
  const get = (slug: string) => idx.bySlug.get(slug)!;

  it("ignores fine-tuned copies and names the versions that retire", () => {
    expect(hostRetirements(get("gpt-4o"))).toEqual([{ host: "OpenAI", date: "2026-11-20", byLab: true, only: ["2024-05-13"] }]);
  });

  it("names the regions that keep the model", () => {
    expect(hostRetirements(get("o3-mini"))).toEqual([
      { host: "Azure OpenAI", date: "2026-11-19", byLab: false, except: ["US government regions"] },
    ]);
  });

  it("dates each step when a host retires a model in stages", () => {
    expect(hostRetirements(get("claude-sonnet-4-5"))).toEqual([
      { host: "Amazon Bedrock", date: "2026-11-30", byLab: false, only: ["Claude Platform"] },
      { host: "Amazon Bedrock", date: "2027-04-08", byLab: false },
    ]);
  });

  it("tells a fast-mode retirement from the model's own", () => {
    const foundry = buildIndex(
      [
        model({ id: "1", name: "claude-opus-5-5", providerId: "f", deprecationDate: "2027-09-18" }),
        model({ id: "2", name: "claude-opus-5-5-fast", providerId: "f", deprecationDate: "2027-02-01" }),
      ],
      [provider("f", "Azure AI")],
      { now: TODAY },
    );
    expect(hostRetirements(foundry.bySlug.get("claude-opus-5-5")!).map(retirementLabel)).toEqual([
      "Azure AI Foundry (fast mode only)",
      "Azure AI Foundry",
    ]);
  });

  it("counts only a host dropping the model as its next retirement", () => {
    expect(nextRetirement(get("gpt-4o"), idx.today)).toBeNull();
    expect(nextRetirement(get("claude-sonnet-4-5"), idx.today)).toMatchObject({ date: "2027-04-08", hosts: ["Amazon Bedrock"] });
    expect(nextRetirement(get("o3-mini"), idx.today)).toMatchObject({
      date: "2026-11-19",
      hosts: ["Azure OpenAI (except US government regions)"],
    });
  });

  it("labels a partial retirement with what it covers", () => {
    expect(retirementLabel({ host: "OpenAI", date: "2026-11-20", byLab: true, only: ["2024-05-13"] })).toBe(
      "OpenAI (2024-05-13 only)",
    );
    expect(retirementLabel({ host: "Amazon Bedrock", date: "2026-11-30", byLab: false, only: [] })).toBe(
      "Amazon Bedrock (some versions only)",
    );
    expect(retirementLabel({ host: "Anthropic", date: "2026-11-30", byLab: true })).toBe("Anthropic");
  });

  it("says what part of a host's offer a retirement covers, with the host left out", () => {
    expect(retirementScope({ host: "OpenAI", date: "2026-11-20", byLab: true, only: ["2024-05-13", "2024-08-06"] })).toBe(
      "2024-05-13, 2024-08-06 only",
    );
    expect(retirementScope({ host: "Amazon Bedrock", date: "2026-11-30", byLab: false, only: [] })).toBe("some versions only");
    expect(retirementScope({ host: "Azure OpenAI", date: "2026-11-30", byLab: false, except: ["US government regions"] })).toBe(
      "all but US government regions",
    );
    expect(retirementScope({ host: "Anthropic", date: "2026-11-30", byLab: true })).toBeNull();
  });
});

describe("replacements", () => {
  const p = [provider("lab", "Acme"), provider("cloud", "Some Cloud")];
  const idx = buildIndex(
    [
      // each -1 leaves Some Cloud on 2026-11-15
      model({ id: "a1", name: "acme-1", providerId: "cloud", releaseDate: "2025-01-01", deprecationDate: "2026-11-15" }),
      model({ id: "a2", name: "acme-2", providerId: "lab", releaseDate: "2026-01-01", deprecationDate: "2026-10-01" }),
      model({ id: "b1", name: "bolt-1", providerId: "cloud", releaseDate: "2025-01-01", deprecationDate: "2026-11-15" }),
      model({ id: "b2", name: "bolt-2", providerId: "lab", releaseDate: "2026-01-01" }),
      model({ id: "b3", name: "bolt-2", providerId: "cloud", deprecationDate: "2027-01-15" }),
      model({ id: "d1", name: "dash-1", providerId: "cloud", releaseDate: "2025-01-01", deprecationDate: "2026-11-15" }),
      model({ id: "d2", name: "dash-2", providerId: "lab", releaseDate: "2026-01-01" }),
      model({ id: "d3", name: "dash-2", providerId: "cloud", deprecationDate: "2027-03-01" }),
    ],
    p,
    { now: TODAY },
  );
  const get = (slug: string) => idx.bySlug.get(slug)!;

  it("never points at a retired model as the newer one", () => {
    expect(get("acme-1").successorSlug).toBe("acme-2");
    expect(liveSuccessor(get("acme-1"), idx)).toBeUndefined();
    expect(liveSuccessor(get("bolt-1"), idx)?.slug).toBe("bolt-2");
  });

  it("suggests moving only to a model that stays at least three months longer", () => {
    const items = retiring(idx, { fromDays: 0, toDays: 30 });
    expect(Object.fromEntries(items.map((i) => [i.model.slug, i.successor?.slug ?? null]))).toEqual({
      "acme-1": null, // retired already
      "bolt-1": null, // leaves Some Cloud 61 days later
      "dash-1": "dash-2", // 106 days later
    });
  });
});

describe("filterModels", () => {
  it("defaults to frontier chat models, dated first, newest first", () => {
    const rows = filterModels(index, {});
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((m) => m.tier === "frontier" && m.kind === "chat")).toBe(true);
    const firstUndated = rows.findIndex((m) => !m.releaseDate);
    if (firstUndated >= 0) expect(rows.slice(firstUndated).every((m) => !m.releaseDate)).toBe(true);
    expect(rows[0].releaseDate! >= rows[1].releaseDate!).toBe(true);
  });

  it("searches names and API ids", () => {
    expect(filterModels(index, { q: "opus 5.5" }).map((m) => m.slug)).toContain("claude-opus-5-5");
    expect(filterModels(index, { q: "anthropic.claude-opus-5-5" }).map((m) => m.slug)).toContain("claude-opus-5-5");
  });

  it("filters by lab and sorts by price", () => {
    const rows = filterModels(index, { lab: "anthropic", sort: "price" });
    expect(rows.every((m) => m.labId === "anthropic")).toBe(true);
    const prices = rows.map((m) => m.reference.blended ?? Infinity);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it("shows open-weight models when asked", () => {
    const rows = filterModels(index, { tier: "open" });
    expect(rows.map((m) => m.slug)).toContain("gpt-oss-120b");
  });
});

describe("frontierLineup hygiene", () => {
  const p = [provider("o", "OpenAI", "frontier"), provider("hub", "AIHubMix"), provider("a", "Anthropic", "frontier")];
  const idx = buildIndex(
    [
      model({ id: "1", name: "gpt-6-sol", providerId: "o", releaseDate: "2026-09-22" }),
      model({ id: "2", name: "gpt-5.4-high", providerId: "hub", releaseDate: "2026-03-05" }),
      model({ id: "3", name: "gpt-chat-latest", providerId: "o", releaseDate: "2026-05-05" }),
      model({ id: "4", name: "claude-2.1", providerId: "a" }),
      model({ id: "5", name: "claude-opus-5-5", providerId: "a", releaseDate: "2026-09-22" }),
      model({ id: "6", name: "gpt-7-preview", providerId: "o", releaseDate: "2026-10-01" }),
    ],
    p,
    { now: TODAY },
  );

  it("skips aliases, previews, gateway-only variants and undated models", () => {
    const lineup = frontierLineup(idx, 6);
    expect(lineup.find((g) => g.lab.id === "openai")!.models.map((m) => m.slug)).toEqual(["gpt-6-sol"]);
    expect(lineup.find((g) => g.lab.id === "anthropic")!.models.map((m) => m.slug)).toEqual(["claude-opus-5-5"]);
  });

  it("keeps aliases out of the release radar", () => {
    expect(releaseRadar(idx, { days: 365, tier: "frontier" }).map((m) => m.slug)).not.toContain("gpt-chat");
  });
});

describe("nextRetirement", () => {
  const today = "2026-10-26";
  const get = (slug: string) => index.bySlug.get(slug)!;

  it("finds the next API retirement and who announced it", () => {
    expect(nextRetirement(get("claude-sonnet-4-5"), today)).toEqual({
      date: "2026-11-30",
      daysLeft: 35,
      hosts: ["Amazon Bedrock", "Anthropic", "Azure AI Foundry"],
      byLab: true,
    });
  });

  it("skips dates already past, subscription plans, earliest-possible dates and single versions", () => {
    // Vertex only promises Claude Opus 5 until at least 2027-01-24; Foundry retires it on 2027-07-08.
    expect(nextRetirement(get("claude-opus-5"), today)).toMatchObject({ date: "2027-07-08", hosts: ["Azure AI Foundry"], byLab: false });
    // Azure retires the 2024-05-13 version on 2026-12-09, and every other one later.
    expect(nextRetirement(get("gpt-4o"), today)).toMatchObject({ date: "2027-04-14", hosts: ["Azure OpenAI"], byLab: false });
  });

  it("returns null when nothing is scheduled", () => {
    const m = get("grok-4-7");
    const undated = { ...m, listings: m.listings.map((l) => ({ ...l, deprecationDate: undefined })) };
    expect(nextRetirement(undated, today)).toBeNull();
  });
});
