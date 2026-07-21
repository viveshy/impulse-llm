"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CommandMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandMenuContext = createContext<CommandMenuState | null>(null);

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandMenuContext.Provider value={{ open, setOpen, toggle: () => setOpen((o) => !o) }}>
      {children}
    </CommandMenuContext.Provider>
  );
}

export function useCommandMenu(): CommandMenuState {
  const ctx = useContext(CommandMenuContext);
  if (!ctx) throw new Error("useCommandMenu must be used within CommandMenuProvider");
  return ctx;
}
