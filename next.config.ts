import type { NextConfig } from "next";

// The old app lived under /app. Model, provider and compare pages redirect from route
// handlers, which look their ids up in the catalog; everything else maps to its new home here.
const LEGACY: [string, string][] = [
  ["/app", "/models"],
  ["/app/models", "/models"],
  ["/app/providers", "/hosts"],
  ["/app/pricing", "/calculator"],
  ["/app/capabilities", "/models"],
  ["/app/api-explorer", "/models"],
  ["/app/playground", "/models"],
  ["/app/settings", "/"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
