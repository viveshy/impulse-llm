import { describe, expect, it } from "vitest";
import { addressKey, HitLimiter } from "../beacon";

const day = new Date("2026-10-26T10:00:00Z");
const ip = "203.0.113.7";

describe("HitLimiter", () => {
  it("caps the views one address can send in a day", () => {
    const l = new HitLimiter({ views: 3, agents: 2 });
    expect([1, 2, 3, 4].map(() => l.allow(ip, "A", day))).toEqual([true, true, true, false]);
    expect(l.allow("198.51.100.9", "A", day)).toBe(true);
  });

  it("caps how many browsers one address can pose as", () => {
    const l = new HitLimiter({ views: 100, agents: 2 });
    expect(["A", "B", "C"].map((ua) => l.allow(ip, ua, day))).toEqual([true, true, false]);
    expect(l.allow(ip, "A", day)).toBe(true);
  });

  it("starts over each UTC day", () => {
    const l = new HitLimiter({ views: 1, agents: 1 });
    expect(l.allow(ip, "A", day)).toBe(true);
    expect(l.allow(ip, "A", new Date("2026-10-26T23:59:59Z"))).toBe(false);
    expect(l.allow(ip, "A", new Date("2026-10-27T00:00:01Z"))).toBe(true);
  });

  it("stops taking new addresses once it tracks its maximum", () => {
    const l = new HitLimiter({ views: 10, agents: 1, addresses: 2 });
    expect(["192.0.2.1", "192.0.2.2", "192.0.2.3"].map((a) => l.allow(a, "A", day))).toEqual([true, true, false]);
    expect(l.allow("192.0.2.1", "A", day)).toBe(true);
  });

  it("treats a whole IPv6 /64 as one address", () => {
    const l = new HitLimiter({ views: 1, agents: 1 });
    expect(l.allow("2001:db8:1:2::1", "A", day)).toBe(true);
    expect(l.allow("2001:db8:1:2:ffff:ffff:ffff:9", "A", day)).toBe(false);
    expect(l.allow("2001:db8:1:3::1", "A", day)).toBe(true);
  });
});

describe("addressKey", () => {
  it("keeps IPv4 as it is, including IPv4 mapped into IPv6", () => {
    expect(addressKey("203.0.113.7")).toBe("203.0.113.7");
    expect(addressKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("reduces IPv6 to its /64, however it is written", () => {
    expect(addressKey("2001:db8:1:2::1")).toBe("2001:db8:1:2::/64");
    expect(addressKey("2001:0DB8:0001:0002:0:0:0:1")).toBe("2001:db8:1:2::/64");
    expect(addressKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(addressKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });
});
