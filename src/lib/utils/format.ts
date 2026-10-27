/** Formatting helpers. Numbers are always rendered with tabular figures. */

/** 200000 → "200K", 2_000_000 → "2M", 8191 → "8K". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    // A binary million (1,048,576) reads as "1M", the way labs advertise it.
    return `${Number((n / 1_000_000).toFixed(1))}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

/** USD price per 1M tokens. `null` → "-". */
export function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return `$${v.toFixed(2)}`;
}

/** Split price into currency symbol + value so the "$" can be dimmed. */
export function splitPrice(v: number | null | undefined): { symbol: string; value: string } {
  if (v === null || v === undefined) return { symbol: "", value: "-" };
  return { symbol: "$", value: v.toFixed(2) };
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2025-11-04" → "Nov 2025". */
export function formatReleaseDate(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatThroughput(tps: number | undefined): string {
  return tps === undefined ? "-" : `${Math.round(tps)} tok/s`;
}

export function formatPct(pct: number | undefined): string {
  return pct === undefined ? "-" : `${pct}%`;
}

/** 4000 → "4,000". */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** "2025-11-04" → days since, as "2d ago" / "3w ago" / "Nov 2025". */
export function relativeFromNow(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const days = Math.floor((now.getTime() - then) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatReleaseDate(iso);
}

const MONTH_DAY = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};

/** USD per million tokens: cents at a dollar and above, the digits that matter below it. */
export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  if (v >= 1000) return `$${Math.round(v).toLocaleString("en-US")}`;
  if (v >= 1 || v === 0) return `$${v.toFixed(2)}`;
  const s = String(Number(v.toPrecision(3)));
  const decimals = s.includes(".") ? s.split(".")[1].length : 0;
  return `$${v.toFixed(Math.min(6, Math.max(2, decimals)))}`;
}

/** A monthly or per-request total. Never prints a non-zero cost as zero. */
export function formatMoney(v: number): string {
  if (v === 0) return "$0";
  if (v < 0.01) return "<$0.01";
  if (v >= 100) return `$${Math.round(v).toLocaleString("en-US")}`;
  return `$${v.toFixed(2)}`;
}

/** "2026-10-26" → "26 Oct 2026". */
export function formatDate(iso: string): string {
  const { y, m, d } = MONTH_DAY(iso);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

/** How long ago an ISO day was, relative to `today`; older than ~2 months shows the month. */
export function formatAgo(iso: string, today: string): string {
  const days = dayDiff(iso, today);
  if (Number.isNaN(days)) return iso;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return formatReleaseDate(iso);
}

/** A countdown in days: "in 12 days", "tomorrow", "3 days ago". */
export function formatDaysLeft(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** How many times another amount: "2.3×", "13×". */
export function formatMultiple(r: number): string {
  return r < 10 ? `${r.toFixed(1)}×` : `${Math.round(r).toLocaleString("en-US")}×`;
}

/** Axis and tile counts: 950, 1.5K, 12.9K, 2.5M. */
export function formatCompact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${Number((n / 1000).toFixed(1))}K`;
  return `${Number((n / 1_000_000).toFixed(1))}M`;
}

/** Shorter than this, a cut-back description says too little; keep the cut-off text instead. */
const MIN_SENTENCES = 40;

/** A description the source cut off mid-sentence ("... large codebases, code...") ends at its last full sentence instead. */
export function wholeSentences(text: string): string {
  const trimmed = text.trimEnd();
  const cut = /(\.\.\.|…)$/.exec(trimmed);
  if (!cut) return text;
  const body = trimmed.slice(0, -cut[0].length).trimEnd();
  let end = -1;
  // ".", "!" or "?" before a space ends a sentence; a version number (5.5) or "e.g." does not.
  for (const m of body.matchAll(/[.!?](?=\s)/g)) {
    if (/\b(e\.g|i\.e|vs|etc)\.$/i.test(body.slice(Math.max(0, m.index - 4), m.index + 1))) continue;
    end = m.index + 1;
  }
  return end >= MIN_SENTENCES ? body.slice(0, end) : `${body}…`;
}
