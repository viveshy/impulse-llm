import type { ReactNode } from "react";

/**
 * Per-page context row (row 2, under the global TopNav): title/breadcrumb on the
 * left, optional page actions on the right. Global search lives in the TopNav.
 */
export function Topbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex h-12 flex-none items-center gap-2 border-b border-border px-[18px] text-[15px]">
      {children}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
