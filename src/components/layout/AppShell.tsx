import type { ReactNode } from "react";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      {/* content centered in a max-width column (Hugging-Face style) so it never
          hugs the left edge or strands whitespace on ultra-wide screens */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
