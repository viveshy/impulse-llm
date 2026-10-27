"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { watchlistHref } from "@/lib/routes";
import { rememberedList } from "./memory";

/**
 * Brings back the list this browser remembers (see ./memory) whenever /watchlist is open without one, on arrival or
 * after the header's link. Saving happens where the list is edited, never here: opening a list is not an edit.
 */
export function WatchMemory({ w, add }: { w: string; add?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (w) return;
    const saved = rememberedList();
    if (saved.length) {
      router.replace(`${watchlistHref(saved)}${add ? `&add=${encodeURIComponent(add)}` : ""}`, { scroll: false });
    }
  }, [w, add, router]);

  return null;
}
