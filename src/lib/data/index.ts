import type { DataSource } from "./data-source";
import { HttpDataSource } from "./http-source";

let instance: DataSource | null = null;

/**
 * The single data-source accessor. Impulse reads the real catalog from
 * impulse-api - there is no seed fallback: if the API is unreachable, requests
 * fail loudly rather than silently serving stale bundled data.
 *
 * `IMPULSE_API_URL` overrides the location (defaults to the local BE).
 */
export function getDataSource(): DataSource {
  if (!instance) {
    const apiUrl = (process.env.IMPULSE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
    instance = new HttpDataSource(apiUrl);
  }
  return instance;
}

export type { DataSource } from "./data-source";
