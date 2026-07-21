import { useSyncExternalStore } from "react";

export type ModelsView = "list" | "grid";

const VIEW_KEY = "impulse:modelsView";
const listeners = new Set<() => void>();

export function getModelsView(): ModelsView | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(VIEW_KEY);
  return v === "grid" || v === "list" ? v : null;
}

export function setModelsView(v: ModelsView): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIEW_KEY, v);
  listeners.forEach((l) => l()); // notify same-tab subscribers
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb); // cross-tab
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * The persisted models view (list/grid), read via useSyncExternalStore so it's
 * hydration-safe (server + first client render use "list", then sync to storage)
 * without a setState-in-effect. Returns [view, setView]; setView persists + notifies.
 */
export function useModelsView(): [ModelsView, (v: ModelsView) => void] {
  const view = useSyncExternalStore<ModelsView>(
    subscribe,
    () => getModelsView() ?? "list",
    () => "list",
  );
  return [view, setModelsView];
}
