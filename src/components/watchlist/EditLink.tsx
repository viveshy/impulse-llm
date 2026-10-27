"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { watchlistHref } from "@/lib/routes";
import type { WatchItem } from "@/lib/watchlist";
import { rememberList } from "./memory";

/** A link that edits the list (removes, unpins, clears): the list it opens becomes the one this browser remembers. */
export function EditLink({
  items,
  children,
  ...props
}: {
  items: WatchItem[];
  children: ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <Link href={watchlistHref(items)} scroll={false} onClick={() => rememberList(items)} {...props}>
      {children}
    </Link>
  );
}
