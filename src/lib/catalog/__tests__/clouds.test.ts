import { describe, expect, it } from "vitest";
import { zoneOf } from "@/lib/clouds";
import { cloudOverview, cloudPage } from "../clouds";
import { cloudIndex as index, zonedIndex } from "./cloud-fixture";

const slugs = (offers: { model: { slug: string } }[]) => offers.map((o) => o.model.slug);

describe("zoneOf", () => {
  it("files each region under the zone a team would choose for data residency", () => {
    expect(zoneOf("global")).toBe("global");
    expect(zoneOf("us-gov")).toBe("us-gov");
    expect(zoneOf("us-gov-west-1")).toBe("us-gov");
    expect(zoneOf("us")).toBe("us");
    expect(zoneOf("us-east-1")).toBe("us");
    expect(zoneOf("eu")).toBe("eu");
    expect(zoneOf("eu-central-1")).toBe("eu");
    expect(zoneOf("uk")).toBe("eu");
    expect(zoneOf("apac")).toBe("apac");
    expect(zoneOf("jp")).toBe("apac");
    expect(zoneOf("in")).toBe("apac");
    expect(zoneOf("ap-south-1")).toBe("apac");
  });

  it("leaves regions outside the five zones, and listings with no region, unzoned", () => {
    expect(zoneOf("sa-east-1")).toBeUndefined();
    expect(zoneOf("ca-central-1")).toBeUndefined();
    expect(zoneOf(undefined)).toBeUndefined();
  });
});

describe("cloudPage", () => {
  const aws = cloudPage(index, "aws")!;

  it("lists the frontier lineup models the cloud carries, and the ones it doesn't with where else they are", () => {
    expect(slugs(aws.lineup)).toEqual(["claude-opus-6"]);
    expect(aws.missing.map((m) => [m.model.slug, m.elsewhere])).toEqual([
      ["gpt-7", ["azure"]],
      ["claude-sonnet-6", []],
      ["gemini-5-pro", ["google-cloud"]],
    ]);
  });

  it("prices a model at its cheapest listing on the cloud, against the lab's own API", () => {
    const opus = aws.lineup[0];
    expect(opus.best?.id).toBe("b-opus6-g");
    expect(opus.vsLab).toBe(0);
  });

  it("shows the zones a model is listed in and the cloud's next retirement of it, even of one region", () => {
    const opus = aws.lineup[0];
    expect(opus.zones).toEqual(["us", "eu", "global"]);
    expect(opus.retires).toMatchObject({ host: "Amazon Bedrock", date: "2027-03-01", only: ["us"] });
  });

  it("keeps older frontier models the cloud still serves, after the lab has retired them, and drops what it retired", () => {
    // Claude 2.1 shipped over two years ago and Claude Instant has no date: stale listings, left out.
    expect(slugs(aws.other)).toEqual(["claude-sonnet-5"]);
    expect(aws.other[0].retires?.date).toBe("2027-01-15");
  });

  it("offers the zones its listings are in, and with one chosen, counts only that zone's listings", () => {
    expect(aws.zones).toEqual(["us", "eu", "global"]);
    const eu = cloudPage(index, "aws", "eu")!;
    expect(eu.zone).toBe("eu");
    expect(eu.lineup[0].best?.id).toBe("b-opus6-eu");
    expect(eu.lineup[0].vsLab).toBeCloseTo(0.1);
    expect(eu.lineup[0].retires).toBeUndefined();
    // Listed with no region: nothing says it is served in Europe.
    expect(eu.other).toEqual([]);
  });

  it("in a zone, tells a model the cloud lists elsewhere from one it doesn't carry at all", () => {
    const us = cloudPage(index, "azure", "us")!;
    expect(slugs(us.lineup)).toEqual(["gpt-7"]);
    expect(us.missing.find((m) => m.model.slug === "claude-opus-6")?.onCloud).toBeDefined();
    expect(us.missing.find((m) => m.model.slug === "gemini-5-pro")?.onCloud).toBeUndefined();
  });

  it("in a zone, places a model outside it only when every listing of it on the cloud names a region", () => {
    const eu = cloudPage(zonedIndex, "aws", "eu")!;
    expect(slugs(eu.lineup)).toEqual(["claude-sonnet-6"]);
    const onCloud = (slug: string) => eu.missing.find((m) => m.model.slug === slug)?.onCloud;
    expect(onCloud("claude-opus-6")).toBe("outside");
    // Its listing with no region could be in Europe.
    expect(onCloud("claude-haiku-6")).toBe("unplaced");
    // Azure AI Foundry lists no regions at all.
    expect(cloudPage(index, "azure", "us")!.missing.find((m) => m.model.slug === "claude-opus-6")?.onCloud).toBe("unplaced");
  });

  it("ignores a zone the cloud has no listings in, or lists no regions for", () => {
    expect(cloudPage(index, "aws", "apac")!.zone).toBeUndefined();
    const google = cloudPage(index, "google-cloud", "eu")!;
    expect(google.zone).toBeUndefined();
    expect(google.zones).toEqual([]);
  });

  it("covers every service the cloud sells models through, and says which list regions", () => {
    const azure = cloudPage(index, "azure")!;
    expect(slugs(azure.lineup)).toEqual(["gpt-7", "claude-opus-6"]);
    expect(azure.services.map((s) => [s.host.name, s.regions])).toEqual([
      ["Azure OpenAI", true],
      ["Azure AI Foundry", false],
    ]);
  });

  it("returns null for a cloud it doesn't know", () => {
    expect(cloudPage(index, "ibm")).toBeNull();
  });
});

describe("cloudOverview", () => {
  const o = cloudOverview(index);

  it("has a card for each cloud in the catalog, with how much of the lineup it carries", () => {
    expect(o.lineupSize).toBe(4);
    expect(o.clouds.map((c) => [c.cloud.id, c.carried, c.labs])).toEqual([
      ["aws", 1, ["anthropic"]],
      ["azure", 2, ["openai", "anthropic"]],
      ["google-cloud", 2, ["anthropic", "google"]],
    ]);
    expect(o.clouds[0].retiring).toBe(2);
  });

  it("lays the lineup out by lab against the clouds", () => {
    expect(o.rows.map((r) => [r.lab.id, slugs(r.models)])).toEqual([
      ["openai", ["gpt-7"]],
      ["anthropic", ["claude-sonnet-6", "claude-opus-6"]],
      ["google", ["gemini-5-pro"]],
    ]);
    const gpt7 = o.rows[0].models[0];
    expect(gpt7.cells.aws).toBeNull();
    expect(gpt7.cells.azure?.vsLab).toBe(0);
  });
});
