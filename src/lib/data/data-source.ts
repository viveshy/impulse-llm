import type { Facets, Model, ModelQuery, Provider } from "@/lib/domain/types";

/**
 * The single contract the UI depends on, implemented by `HttpDataSource` over
 * the real API. Keeping it an interface means the UI never couples to transport.
 */
export interface DataSource {
  getProviders(): Promise<Provider[]>;
  getProvider(id: string): Promise<Provider | null>;
  getModels(query?: ModelQuery): Promise<Model[]>;
  getModel(id: string): Promise<Model | null>;
  getModelsByProvider(providerId: string): Promise<Model[]>;
  getFacets(): Promise<Facets>;
}
