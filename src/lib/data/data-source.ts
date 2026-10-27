import type { AnalyticsSummary, CatalogSnapshot, Model, PageHit, PriceChange } from "@/lib/domain/types";

/**
 * The single contract the UI depends on, implemented by `HttpDataSource` over
 * the real API. Keeping it an interface means the UI never couples to transport.
 */
export interface DataSource {
  /** The whole catalog (cached in memory for a few minutes). */
  getCatalog(): Promise<CatalogSnapshot>;
  /** Recent list-price moves; null when the API can't say. */
  getPriceChanges(days: number): Promise<PriceChange[] | null>;
  /**
   * Visitor counts; null when analytics is unavailable. The fetch's revalidate period caps
   * the whole route's, so only the stats page asks for less than the 300s default.
   */
  getAnalyticsSummary(days: number, revalidateSeconds?: number): Promise<AnalyticsSummary | null>;
  /** Forwards one page view; true when it was counted. Never throws. */
  recordHit(hit: PageHit): Promise<boolean>;
  /** One listing with its detail-only fields (benchmarks, raw spec); null when unknown. */
  getModel(id: string): Promise<Model | null>;
}
