"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];
export const THEME_KEY = "impulse-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function current(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "dark" || t === "system" ? t : "light";
}

const ICON = { light: Sun, dark: Moon, system: Monitor };

/** Cycles light → dark → system; the head script in the root layout applies it before paint. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "light");
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = ICON[theme];

  const apply = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // private mode: the choice lasts for this page only
    }
  };

  return (
    <button
      type="button"
      onClick={apply}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
      className="grid h-9 w-9 flex-none place-items-center rounded-[8px] border border-border text-ink-2 transition-colors hover:border-border-strong hover:bg-hover hover:text-ink"
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}
