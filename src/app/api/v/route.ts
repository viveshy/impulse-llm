import type { NextRequest } from "next/server";
import { HitLimiter } from "@/lib/beacon";
import { getDataSource } from "@/lib/data";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { canonicalPage } from "@/lib/routes";

const limiter = new HitLimiter();

const done = () => new Response(null, { status: 204 });

/**
 * Page-view beacon. Only views of real pages count, under their canonical path, and only within the per-address daily
 * limits. The client IP is nginx's X-Real-IP, set from the socket so it can't be forged (behind a CDN, nginx's real_ip
 * module has to restore the visitor's address first). The API hashes it with a daily salt and never stores it.
 * Always 204: the page doesn't care.
 */
export async function POST(req: NextRequest) {
  const h = req.headers;
  if (h.get("dnt") === "1" || h.get("sec-gpc") === "1") return done();

  let p: unknown, r: unknown;
  try {
    ({ p, r } = (await req.json()) ?? {});
  } catch {
    return done();
  }
  const ip = h.get("x-real-ip") ?? "";
  const ua = (h.get("user-agent") ?? "").slice(0, 512);
  if (!ip || typeof p !== "string") return done();
  try {
    const path = canonicalPage(await getCatalogIndex(), p.slice(0, 512));
    if (path && limiter.allow(ip, ua)) {
      await getDataSource().recordHit({ path, ip, ua, ref: typeof r === "string" && r ? r.slice(0, 512) : undefined });
    }
  } catch {
    // the catalog is unavailable: skip the count rather than fail the beacon
  }
  return done();
}
