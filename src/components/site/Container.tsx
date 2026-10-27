import type { ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mx-auto w-full max-w-[1200px] px-4 sm:px-6", className)}>{children}</div>;
}
