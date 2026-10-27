import { describe, expect, it } from "vitest";
import type { PriceChange } from "@/lib/domain/types";
import type { WatchItem } from "@/lib/watchlist";
import { buildIndex } from "../group";
import { watchRows } from "../watch";
import { watchCalendar, watchFeed } from "../watch-feeds";
import { model, provider, TODAY } from "./helpers";

const MODELS = [
  model({ id: "o-gpt5", name: "gpt-5", providerId: "o", releaseDate: "2025-08-07", deprecationDate: "2026-12-11", input: 1.25, output: 10 }),
  model({ id: "o-gpt55", name: "gpt-5.5", providerId: "o", releaseDate: "2026-04-01", input: 2, output: 12 }),
  model({ id: "o-mini", name: "gpt-5.4-mini", providerId: "o", releaseDate: "2026-03-17", deprecationDate: "2026-11-01", input: 0.75, output: 4.5 }),
  model({ id: "o-nano", name: "gpt-5.4-nano", providerId: "o", releaseDate: "2026-03-17", deprecationDate: "2027-06-01", input: 0.2, output: 1.25 }),
  model({ id: "o-gpt41", name: "gpt-4.1", providerId: "o", releaseDate: "2025-04-14", input: 2, output: 8 }),
  model({ id: "b-opus", name: "anthropic.claude-opus-5-5", providerId: "b", releaseDate: "2026-09-01", input: 5, output: 25 }),
];
const PROVIDERS = [provider("o", "OpenAI", "frontier"), provider("b", "AWS - Bedrock")];
const index = buildIndex(MODELS, PROVIDERS, { now: TODAY });

const items: WatchItem[] = [
  { model: "gpt-5", host: "openai" },
  { model: "gpt-5-4-mini", host: "openai" },
  { model: "gpt-5-4-nano", host: "openai" },
  { model: "gpt-4-1", host: "openai" },
  { model: "claude-opus-5-5", host: "amazon-bedrock" },
  { model: "gpt-9", host: "openai" },
];
const changes: PriceChange[] = [
  {
    listingId: "b-opus",
    name: "anthropic.claude-opus-5-5",
    host: { id: "b", name: "AWS - Bedrock" },
    from: { inputPerMTok: 6, outputPerMTok: 30 },
    to: { inputPerMTok: 5, outputPerMTok: 25 },
    at: "2026-10-12T06:40:00+00:00",
  },
];
const rows = watchRows(index, items, changes);
const link = "https://impulse.viveshy.com/watchlist?w=gpt-5@openai";
const opts = { link, today: index.today, stamp: "2026-10-26T06:41:00Z" };

describe("watchCalendar", () => {
  const ics = watchCalendar(rows, opts);
  const events = ics.split("BEGIN:VEVENT").slice(1);

  it("is an iCalendar file with CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("has one all-day event per scheduled retirement, with a stable id", () => {
    expect(events).toHaveLength(3);
    const gpt5 = events.find((e) => e.includes("SUMMARY:GPT-5 retires on OpenAI"))!;
    expect(gpt5).toContain("DTSTART;VALUE=DATE:20261211\r\n");
    expect(gpt5).toContain("DTEND;VALUE=DATE:20261212\r\n");
    expect(gpt5).toContain("UID:gpt-5@openai~all@impulse.viveshy.com\r\n");
    expect(gpt5).toContain("DTSTAMP:20261026T064100Z\r\n");
  });

  it("keeps an event on its day, when the model has just retired, under the same id", () => {
    const onTheDay = buildIndex(MODELS, PROVIDERS, { now: new Date("2026-12-11T00:30:00Z") });
    const ics2 = watchCalendar(watchRows(onTheDay, [{ model: "gpt-5", host: "openai" }]), { ...opts, today: onTheDay.today });
    expect(ics2).toContain("DTSTART;VALUE=DATE:20261211\r\n");
    expect(ics2).toContain("UID:gpt-5@openai~all@impulse.viveshy.com\r\n");
  });

  it("keeps an event's id when the host moves the date, so an imported calendar updates it", () => {
    const later = buildIndex(
      MODELS.map((m) => (m.id === "o-gpt5" ? { ...m, deprecationDate: "2027-01-15" } : m)),
      PROVIDERS,
      { now: TODAY },
    );
    const ics2 = watchCalendar(watchRows(later, [{ model: "gpt-5", host: "openai" }]), opts);
    expect(ics2).toContain("DTSTART;VALUE=DATE:20270115\r\n");
    expect(ics2).toContain("UID:gpt-5@openai~all@impulse.viveshy.com\r\n");
  });

  it("reminds 30 and 7 days ahead", () => {
    const gpt5 = events.find((e) => e.includes("SUMMARY:GPT-5 retires"))!;
    expect(gpt5.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(gpt5).toContain("TRIGGER:-P30D");
    expect(gpt5).toContain("TRIGGER:-P7D");
  });

  it("says what to move to and links the watchlist, escaped for iCalendar", () => {
    const gpt5 = events.find((e) => e.includes("SUMMARY:GPT-5 retires"))!.replace(/\r\n /g, "");
    expect(gpt5).toContain("Move to GPT-5.5");
    expect(gpt5).toContain(`Your watchlist: ${link}`);
    expect(gpt5).toMatch(/DESCRIPTION:.*\\n/);
  });

  it("folds lines longer than 75 bytes", () => {
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});

describe("watchFeed", () => {
  const xml = watchFeed(rows, opts);
  const items = xml.split("<item>").slice(1);
  const titles = items.map((i) => i.match(/<title>(.*)<\/title>/)![1]);

  it("is RSS 2.0", () => {
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(`<link>${link.replace(/&/g, "&amp;")}</link>`);
  });

  it("announces each retirement once per stage, dated the day the stage starts", () => {
    // 46 days out: inside 90. 6 days out: inside a week. 218 days out: scheduled.
    expect(titles).toContain("Within 90 days: GPT-5 retires on OpenAI on 11 Dec 2026");
    expect(titles).toContain("Within a week: GPT-5.4 Mini retires on OpenAI on 1 Nov 2026");
    expect(titles).toContain("Scheduled: GPT-5.4 Nano retires on OpenAI on 1 Jun 2027");
    const gpt5 = items.find((i) => i.includes("Within 90 days: GPT-5 "))!;
    expect(gpt5).toContain("<pubDate>Sat, 12 Sep 2026 08:00:00 GMT</pubDate>");
    expect(gpt5).toContain('<guid isPermaLink="false">gpt-5@openai~2026-12-11~90</guid>');
  });

  it("reports price moves, newer models and models that are gone", () => {
    expect(titles).toContain("Price cut: Claude Opus 5.5 on Amazon Bedrock, 17% lower");
    expect(titles).toContain("Newer than GPT-4.1: GPT-5.5");
    expect(titles).toContain("Not listed: GPT-9 on OpenAI");
  });

  it("doesn't say what a host it doesn't know serves", () => {
    const feed = watchFeed(watchRows(index, [{ model: "gpt-5", host: "made-up-host" }]), opts);
    expect(feed).toContain("<title>Not on made-up-host: GPT-5</title>");
    expect(feed).toContain("<description>Move to GPT-5.5.</description>");
  });

  it("says which regions stay when the host retires all of it but some", () => {
    const idx = buildIndex(
      [
        model({ id: "az-gpt5", name: "gpt-5", providerId: "az", deprecationDate: "2026-10-20", input: 1.25, output: 10 }),
        model({ id: "az-gpt5-gov", name: "gpt-5", providerId: "az", route: "us-gov", input: 1.25, output: 10 }),
      ],
      [provider("az", "Azure")],
      { now: TODAY },
    );
    const feed = watchFeed(watchRows(idx, [{ model: "gpt-5", host: "azure-openai" }]), { ...opts, today: idx.today });
    expect(feed).toContain("<title>Retired: GPT-5 on Azure OpenAI (all but US government regions) on 20 Oct 2026</title>");
  });

  it("leaves an undated event undated rather than inventing a day", () => {
    const gone = items.find((i) => i.includes("Not listed: GPT-9"))!;
    expect(gone).not.toContain("<pubDate>");
  });

  it("dates the feed by when the catalog was built", () => {
    expect(xml).toContain("<lastBuildDate>Mon, 26 Oct 2026 06:41:00 GMT</lastBuildDate>");
  });

  it("says what to do next even when there is nothing newer to move to", () => {
    for (const item of items) expect(item).not.toContain("<description></description>");
    const mini = items.find((i) => i.includes("GPT-5.4 Mini retires"))!;
    expect(mini).toContain("<description>Nothing newer in its line yet. Its page lists alternatives. The host's notice:");
    expect(mini).toContain("<link>https://impulse.viveshy.com/models/openai/gpt-5-4-mini#alternatives</link>");
  });

  it("counts a single model in the singular", () => {
    expect(watchFeed(rows.slice(0, 1), opts)).toContain("newer models for the one model on this watchlist.");
    expect(xml).toContain("newer models for the 6 models on this watchlist.");
  });
});
