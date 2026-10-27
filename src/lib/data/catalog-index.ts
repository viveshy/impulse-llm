import { buildIndex } from "@/lib/catalog/group";
import type { CatalogIndex } from "@/lib/catalog/types";
import { getDataSource } from ".";

let memo: { loadedAt: number; index: CatalogIndex } | null = null;

/** The canonical index over the current catalog, rebuilt only when the catalog reloads. */
export async function getCatalogIndex(): Promise<CatalogIndex> {
  const snapshot = await getDataSource().getCatalog();
  if (memo?.loadedAt !== snapshot.loadedAt) {
    memo = {
      loadedAt: snapshot.loadedAt,
      index: buildIndex(snapshot.models, snapshot.providers, {
        now: new Date(),
        generatedAt: snapshot.meta.generated_at,
      }),
    };
  }
  return memo.index;
}
