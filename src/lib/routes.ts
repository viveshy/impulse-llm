/** Canonical URLs: a model lives at /models/<lab>/<model-key>. */
import type { CanonicalModel, CatalogIndex } from "@/lib/catalog/types";
import { cloudById, type ZoneId } from "@/lib/clouds";
import { MAX_COMPARE } from "@/lib/compare";
import { watchParam, type WatchItem } from "@/lib/watchlist";

export const SITE_URL = "https://impulse.viveshy.com";

type ModelRef = Pick<CanonicalModel, "labSlug" | "slug">;

export const modelHref = (m: ModelRef) => `/models/${m.labSlug}/${m.slug}`;
export const labHref = (labSlug: string) => `/labs/${labSlug}`;
export const hostHref = (hostSlug: string) => `/hosts/${hostSlug}`;
export const cloudHref = (cloudId: string, zone?: ZoneId) => `/clouds/${cloudId}${zone ? `?zone=${zone}` : ""}`;
export const compareHref = (models: ModelRef[]) =>
  `/compare?m=${models.map((m) => `${m.labSlug}/${m.slug}`).join(",")}`;
export const watchlistHref = (items: WatchItem[]) => (items.length ? `/watchlist?w=${watchParam(items)}` : "/watchlist");
/** The watchlist, with the model ready to add. */
export const watchAddHref = (m: ModelRef) => `/watchlist?add=${m.slug}`;

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** The model for a URL, a redirect when it was asked for under the wrong lab, or null. */
export function resolveModelRoute(
  index: CatalogIndex,
  lab: string,
  model: string,
): { model: CanonicalModel } | { redirect: string } | null {
  const m = index.bySlug.get(decode(model).toLowerCase());
  if (!m) return null;
  return m.labSlug === decode(lab).toLowerCase() ? { model: m } : { redirect: modelHref(m) };
}

const STATIC_PAGES = new Set([
  "/",
  "/models",
  "/labs",
  "/hosts",
  "/compare",
  "/calculator",
  "/releases",
  "/retiring",
  "/stats",
  "/watchlist",
  "/clouds",
]);

const labSlugs = new WeakMap<CatalogIndex, Set<string>>();

/** Labs with a page: those with at least one model that isn't only a `-latest` alias. */
export function labsOf(index: CatalogIndex): Set<string> {
  let set = labSlugs.get(index);
  if (!set) {
    set = new Set(index.models.filter((m) => !m.aliasOnly).map((m) => m.labSlug));
    labSlugs.set(index, set);
  }
  return set;
}

/** The canonical path of the page that `path` shows, or null when no page lives there. */
export function canonicalPage(index: CatalogIndex, path: string): string | null {
  if (STATIC_PAGES.has(path)) return path;
  const [root, section, a, b, ...rest] = path.split("/");
  if (root !== "" || !a || rest.length) return null;
  if (section === "models" && b) {
    const r = resolveModelRoute(index, a, b);
    return r && "model" in r ? modelHref(r.model) : null;
  }
  if (b !== undefined) return null;
  const slug = decode(a).toLowerCase();
  if (section === "labs") return labsOf(index).has(slug) ? labHref(slug) : null;
  if (section === "hosts") return index.hostBySlug.has(slug) ? hostHref(slug) : null;
  if (section === "clouds") return cloudById(slug) ? cloudHref(slug) : null;
  return null;
}

/** Where an old `/app/models/<listing id>` link now lives. */
export function legacyModelPath(index: CatalogIndex, id: string): string {
  const m = index.byListingId.get(decode(id));
  return m ? modelHref(m) : "/models";
}

/** Where an old `/app/compare?ids=<listing id>,…` link now lives: the same models, deduped. */
export function legacyComparePath(index: CatalogIndex, ids: string | null): string {
  const models: CanonicalModel[] = [];
  for (const id of (ids ?? "").split(",")) {
    const m = index.byListingId.get(id.trim());
    if (m && !models.includes(m) && models.length < MAX_COMPARE) models.push(m);
  }
  return models.length ? compareHref(models) : "/compare";
}

/** Where an old `/app/providers/<provider id>` link now lives. */
export function legacyHostPath(index: CatalogIndex, id: string): string {
  const host = index.hosts.find((h) => h.id === decode(id));
  return host ? hostHref(host.slug) : "/hosts";
}
