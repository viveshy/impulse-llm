"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { serializeModelQuery } from "@/lib/models-query-url";
import type { Facets, Model, ModelQuery, Provider } from "@/lib/domain/types";
import { qk } from "./keys";

/**
 * Client hooks fetch same-origin API route handlers (see src/app/api/*), which
 * run the real data source server-side. The browser never touches the backend
 * directly, so its URL and full-catalog paging stay on the server - and client
 * queries always see the same data the server rendered (no seed/real split).
 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export function useModels(query: ModelQuery = {}, initialData?: Model[]) {
  const qs = serializeModelQuery(query).toString();
  return useQuery({
    queryKey: qk.models(query),
    queryFn: () => getJson<Model[]>(`/api/models${qs ? `?${qs}` : ""}`),
    placeholderData: keepPreviousData,
    initialData,
  });
}

export function useModel(id: string, initialData?: Model | null) {
  return useQuery({
    queryKey: qk.model(id),
    queryFn: () => getJson<Model | null>(`/api/models/${encodeURIComponent(id)}`),
    initialData,
  });
}

export function useProviders(initialData?: Provider[]) {
  return useQuery({
    queryKey: qk.providers,
    queryFn: () => getJson<Provider[]>(`/api/providers`),
    initialData,
  });
}

export function useProvider(id: string, initialData?: Provider | null) {
  return useQuery({
    queryKey: qk.provider(id),
    queryFn: () => getJson<Provider | null>(`/api/providers/${encodeURIComponent(id)}`),
    initialData,
  });
}

export function useModelsByProvider(providerId: string, initialData?: Model[]) {
  return useQuery({
    queryKey: qk.modelsByProvider(providerId),
    queryFn: () => getJson<Model[]>(`/api/providers/${encodeURIComponent(providerId)}/models`),
    initialData,
  });
}

export function useFacets(initialData?: Facets) {
  return useQuery({
    queryKey: qk.facets,
    queryFn: () => getJson<Facets>(`/api/facets`),
    initialData,
  });
}
