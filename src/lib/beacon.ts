/**
 * Limits on the page-view beacon, kept in this server's memory and never stored. Per UTC day, one address can send at
 * most `views` views and pose as at most `agents` browsers (user agents); past a limit, a view just isn't counted.
 */
export class HitLimiter {
  private day = "";
  private readonly seen = new Map<string, { views: number; agents: Set<string> }>();
  private readonly max: { views: number; agents: number; addresses: number };

  constructor(max: Partial<{ views: number; agents: number; addresses: number }> = {}) {
    this.max = { views: 300, agents: 8, addresses: 50_000, ...max };
  }

  allow(ip: string, ua: string, now = new Date()): boolean {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.seen.clear();
    }
    const key = addressKey(ip);
    let s = this.seen.get(key);
    if (!s) {
      if (this.seen.size >= this.max.addresses) return false; // keeps memory bounded under a flood
      s = { views: 0, agents: new Set() };
      this.seen.set(key, s);
    }
    if (s.views >= this.max.views || (!s.agents.has(ua) && s.agents.size >= this.max.agents)) return false;
    s.views++;
    s.agents.add(ua);
    return true;
  }
}

/** What one person controls: an IPv4 address, or an IPv6 /64 (a home or a phone gets a whole /64). */
export function addressKey(ip: string): string {
  const a = ip.trim().toLowerCase().split("%")[0];
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  if (!a.includes(":")) return a;
  const [head, tail] = a.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
