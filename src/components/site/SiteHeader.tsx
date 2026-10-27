"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useCommandMenu } from "@/components/layout/command-menu-context";
import { clsx } from "@/lib/utils/clsx";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/models", label: "Models" },
  { href: "/releases", label: "Releases" },
  { href: "/retiring", label: "Retiring" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/compare", label: "Compare" },
  { href: "/calculator", label: "Calculator" },
  { href: "/labs", label: "Labs" },
  { href: "/clouds", label: "Clouds" },
  { href: "/hosts", label: "Hosts" },
];

function NavLinks({ className, scrollToCurrent }: { className?: string; scrollToCurrent?: boolean }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scrollToCurrent || !nav || !current) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [pathname, scrollToCurrent]);
  return (
    <nav ref={ref} aria-label="Main" className={className}>
      {NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[14.5px] transition-colors",
              active ? "font-medium text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {label}
            {active && <span className="absolute inset-x-[10px] -bottom-[11px] h-[2px] rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const { setOpen } = useCommandMenu();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
      <Container className="flex h-[58px] items-center gap-4">
        <Logo />
        <NavLinks className="ml-4 hidden items-center gap-[2px] lg:flex" />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            // Between lg and xl the full nav needs the room, so the button shrinks to its icon.
            className="flex h-9 items-center gap-2 rounded-[8px] border border-border bg-panel px-[10px] text-[14px] text-ink-3 transition-colors hover:border-border-strong hover:text-ink sm:w-[230px] lg:w-9 lg:justify-center lg:px-0 xl:w-[230px] xl:justify-start xl:px-[10px]"
            aria-label="Search models"
            title="Search models (⌘K)"
          >
            <Search size={15} strokeWidth={1.8} className="flex-none" />
            <span className="hidden sm:inline lg:hidden xl:inline">Search models…</span>
            <kbd className="ml-auto hidden rounded-[4px] border border-border px-[5px] font-sans text-[11.5px] text-ink-4 sm:inline lg:hidden xl:inline">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </Container>
      <Container className="lg:hidden">
        <NavLinks
          scrollToCurrent
          className="relative -mx-[10px] flex items-center gap-[2px] overflow-x-auto pb-[10px] pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] [scrollbar-width:none]"
        />
      </Container>
    </header>
  );
}
