import type { Facets, Model, ModelQuery, Provider } from "@/lib/domain/types";
import type { ModelPage } from "./query";

/**
 * The single contract the UI depends on, implemented by `HttpDataSource` over
 * the real API. Keeping it an interface means the UI never couples to transport.
 */
export interface DataSource {
  getProviders(): Promise<Provider[]>;
  getProvider(id: string): Promise<Provider | null>;
  getModels(query?: ModelQuery): Promise<Model[]>;
  /** Cursor-paginated window over the same filter/sort as getModels, for the models list UI. */
  getModelsPage(query: ModelQuery | undefined, cursor: string | null, limit: number): Promise<ModelPage>;
  getModel(id: string): Promise<Model | null>;
  getModelsByProvider(providerId: string): Promise<Model[]>;
  getFacets(): Promise<Facets>;
}
