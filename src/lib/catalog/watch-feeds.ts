/**
 * The watchlist as a calendar (iCalendar) and as a news feed (RSS 2.0). Nothing is stored: every event is dated by
 * the data itself (a retirement date, the day a price moved, a release), so ids and dates stay the same from one
 * fetch to the next and readers and calendars don't show anything twice.
 */
import { modelHref, SITE_URL } from "@/lib/routes";
import { formatDate } from "@/lib/utils/format";
import { hostLabel } from "./detail";
import { daysBetween, retirementLabel, type HostRetirement } from "./select";
import { isMoving, type WatchRow } from "./watch";

export interface FeedOptions {
  /** The watchlist page these feeds belong to. */
  link: string;
  /** The feed's own URL. */
  self?: string;
  today: string;
  /** When the catalog was built (ISO). */
  stamp: string;
}

const DAY_MS = 86_400_000;
const SITE_HOST = new URL(SITE_URL).host;

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** "Move to GPT-5.5 (on OpenAI, 31% more)", or null when there is nothing to move to. */
function moveTo(row: WatchRow): string | null {
  const s = row.successor;
  if (!s) return null;
  // A host the catalog doesn't know: nothing to say about what it serves.
  if (!row.hostKnown) return `Move to ${s.model.name}`;
  if (!s.listing) return `Move to ${s.model.name} (${s.retiredHere ? "retired on" : "not on"} ${row.hostName}${s.retiredHere ? "" : " yet"})`;
  const pct = s.delta === null ? null : Math.round(s.delta * 100);
  const price = pct === null ? "" : pct === 0 ? ", same price" : `, ${Math.abs(pct)}% ${pct < 0 ? "less" : "more"}`;
  return `Move to ${s.model.name} (on ${row.hostName}${price})`;
}

/** What to do about it: what to move to or, with nothing newer, where to look instead. */
function nextStep(row: WatchRow): string {
  const next = moveTo(row);
  if (next) return `${next}.`;
  return row.model ? "Nothing newer in its line yet. Its page lists alternatives." : "Nothing newer in its line yet.";
}

/* ---------- iCalendar ---------- */

const icsText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDay = (day: string) => day.replace(/-/g, "");
const icsStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const encoder = new TextEncoder();

/** RFC 5545: lines of at most 75 octets; a continuation starts with a space, which counts. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = "";
      bytes = 0;
    }
    part += ch;
    bytes += n;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

const alarm = (days: number, summary: string) => [
  "BEGIN:VALARM",
  "ACTION:DISPLAY",
  `TRIGGER:-P${days}D`,
  `DESCRIPTION:${icsText(`In ${days} days: ${summary}`)}`,
  "END:VALARM",
];

/** What a retirement takes, for its event's id: "all", "only-fast-mode", "except-us". */
const scopeId = (r: HostRetirement) =>
  (r.only ? `only-${r.only.join("-") || "some"}` : r.except ? `except-${r.except.join("-")}` : "all")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-");

/**
 * One all-day event per scheduled retirement, and per retirement of the last few months, with reminders 30 and 7 days
 * before. An event's id names the row and what retires, not the day, so a postponed date moves the event rather than
 * adding a second one; and the event stays on its day and after.
 */
export function watchCalendar(rows: WatchRow[], opts: FeedOptions): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Impulse//Watchlist//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Impulse watchlist",
    `X-WR-CALDESC:${icsText("Retirement dates for the models on your Impulse watchlist.")}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const row of rows) {
    const ids = new Set<string>();
    for (const r of [...row.recent, ...row.retirements]) {
      // Two retirements of the same part (rare: "some versions" twice) tell apart by their dates.
      const id = ids.has(scopeId(r)) ? `${scopeId(r)}-${r.date}` : scopeId(r);
      ids.add(id);
      const summary = `${row.name} retires on ${retirementLabel(r)}`;
      const description = [
        `${retirementLabel(r)} ${r.date <= opts.today ? "retired" : "retires"} ${row.name} on ${formatDate(r.date)}.`,
        nextStep(row),
        row.noticeUrl && `The host's notice: ${row.noticeUrl}`,
        `Your watchlist: ${opts.link}`,
      ]
        .filter(Boolean)
        .join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${row.key}~${id}@${SITE_HOST}`,
        `DTSTAMP:${icsStamp(opts.stamp)}`,
        `DTSTART;VALUE=DATE:${icsDay(r.date)}`,
        `DTEND;VALUE=DATE:${icsDay(addDays(r.date, 1))}`,
        `SUMMARY:${icsText(summary)}`,
        `DESCRIPTION:${icsText(description)}`,
        ...(row.model ? [`URL:${SITE_URL}${modelHref(row.model)}`] : []),
        "TRANSP:TRANSPARENT",
        ...alarm(30, summary),
        ...alarm(7, summary),
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/* ---------- RSS ---------- */

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A retirement is announced again as it comes within each of these, smallest first. */
const STAGES: [days: number, label: string][] = [
  [7, "Within a week"],
  [30, "Within 30 days"],
  [90, "Within 90 days"],
  [365, "Scheduled"],
];

interface FeedItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  /** The ISO day it happened; undated items are left undated. */
  day?: string;
}

const GONE_TITLE: Partial<Record<WatchRow["state"], (r: WatchRow) => string>> = {
  "model-gone": (r) => `Not listed: ${r.name} on ${r.hostName}`,
  "host-gone": (r) => `Not on ${r.hostName}: ${r.name}`,
  "pin-gone": (r) => `Pinned version gone: ${r.name} on ${r.hostName}`,
};

function feedItems(rows: WatchRow[], opts: FeedOptions): FeedItem[] {
  const items: FeedItem[] = [];
  for (const row of rows) {
    const link = row.model ? `${SITE_URL}${modelHref(row.model)}` : opts.link;
    // With nothing newer to move to, send the reader to the alternatives on the model's page.
    const act = { link: row.successor || !row.model ? link : `${link}#alternatives`, description: nextStep(row) };
    for (const r of row.retirements) {
      const stage = STAGES.find(([days]) => daysBetween(opts.today, r.date) <= days);
      if (!stage) continue;
      items.push({
        guid: `${row.key}~${r.date}~${stage[0]}`,
        day: addDays(r.date, -stage[0]),
        title: `${stage[1]}: ${row.name} retires on ${retirementLabel(r)} on ${formatDate(r.date)}`,
        link: act.link,
        description: [act.description, row.noticeUrl && `The host's notice: ${row.noticeUrl}`].filter(Boolean).join(" "),
      });
    }
    const gone = GONE_TITLE[row.state];
    if (gone) items.push({ guid: `${row.key}~gone`, title: gone(row), ...act });
    if (row.state === "retired") {
      items.push({
        guid: `${row.key}~retired`,
        ...(row.retiredOn ? { day: row.retiredOn } : {}),
        title: `Retired: ${row.name} on ${row.hostName}${row.except ? ` (all but ${row.except.join(", ")})` : ""}${row.retiredOn ? ` on ${formatDate(row.retiredOn)}` : ""}`,
        ...act,
      });
    }
    const move = row.priceMove;
    if (move) {
      const pct = Math.round(Math.abs(move.change) * 100);
      items.push({
        guid: `${row.key}~price~${move.at}`,
        day: move.at,
        title:
          move.change < 0
            ? `Price cut: ${row.name} on ${hostLabel(move.listing)}, ${pct}% lower`
            : `Price rise: ${row.name} on ${hostLabel(move.listing)}, ${pct}% higher`,
        link,
        description: "Blended price, 3 parts input to 1 part output, over the last 30 days.",
      });
    }
    const newer = row.successor?.model;
    if (newer && !isMoving(row)) {
      items.push({
        guid: `${row.key}~newer~${newer.slug}`,
        ...(newer.releaseDate ? { day: newer.releaseDate } : {}),
        title: `Newer than ${row.name}: ${newer.name}`,
        link: `${SITE_URL}${modelHref(newer)}`,
        description: act.description,
      });
    }
  }
  // Newest first; undated news first of all.
  return items.sort((a, b) => (b.day ?? "9999").localeCompare(a.day ?? "9999"));
}

export function watchFeed(rows: WatchRow[], opts: FeedOptions): string {
  const items = feedItems(rows, opts).map(
    (i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="false">${xml(i.guid)}</guid>${i.day ? `\n      <pubDate>${new Date(`${i.day}T08:00:00Z`).toUTCString()}</pubDate>` : ""}
      <description>${xml(i.description)}</description>
    </item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Impulse watchlist</title>
    <link>${xml(opts.link)}</link>${opts.self ? `\n    <atom:link href="${xml(opts.self)}" rel="self" type="application/rss+xml" />` : ""}
    <description>Retirements, price moves and newer models for ${rows.length === 1 ? "the one model" : `the ${rows.length} models`} on this watchlist.</description>
    <language>en</language>
    <lastBuildDate>${new Date(opts.stamp).toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;
}
