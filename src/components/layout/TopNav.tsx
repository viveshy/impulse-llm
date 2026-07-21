"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { clsx } from "@/lib/utils/clsx";
import { NavSearch } from "./NavSearch";

const NAV = [
  { href: "/app/models", label: "Models" },
  { href: "/app/providers", label: "Providers" },
  { href: "/app/capabilities", label: "Capabilities" },
  { href: "/app/pricing", label: "Pricing" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/api-explorer", label: "API" },
  { href: "/app/playground", label: "Playground" },
];

function BrandMark() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-[5px] border border-border-strong">
      <span className="block h-2 w-2 rotate-45 rounded-[1px] border-[1.5px] border-ink-2" />
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-[52px] flex-none items-center border-b border-border bg-bg/85 backdrop-blur-[10px]">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6">
      <Link href="/" className="flex flex-none items-center gap-[9px]">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Impulse</span>
      </Link>

      <NavSearch />

      <nav className="ml-auto flex min-w-0 items-center gap-[2px] overflow-x-auto">
        {NAV.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex-none rounded-[7px] px-[11px] py-[7px] text-[15px] transition-colors",
                active ? "text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              {label}
              {active && (
                <motion.span
                  layoutId="topnav-active"
                  className="absolute inset-x-[10px] -bottom-[8px] h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/app/settings"
        aria-label="Settings"
        className={clsx(
          "ml-1 grid h-[32px] w-[32px] flex-none place-items-center rounded-[7px] border transition-colors",
          isActive(pathname, "/app/settings")
            ? "border-border-strong text-ink"
            : "border-border text-ink-3 hover:border-border-strong hover:text-ink",
        )}
      >
        <Settings size={15} />
      </Link>
      </div>
    </header>
  );
}
