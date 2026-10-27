"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

let first = true;

/** Counts a page view per route change. Skipped under Do Not Track or Global Privacy Control. */
export function Beacon() {
  const pathname = usePathname();
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    // document.referrer never changes after the first load, so only the landing view carries it
    const ref = first && document.referrer ? document.referrer : undefined;
    first = false;
    const body = JSON.stringify({ p: pathname, r: ref });
    const sent = navigator.sendBeacon?.("/api/v", new Blob([body], { type: "application/json" }));
    if (!sent) {
      fetch("/api/v", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);
  return null;
}
