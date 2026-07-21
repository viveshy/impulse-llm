/** Formatting helpers. Numbers are always rendered with tabular figures. */

/** 200000 → "200K", 2_000_000 → "2M", 8191 → "8K". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

/** USD price per 1M tokens. `null` → em dash. */
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
