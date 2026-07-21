import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { CommandMenuProvider } from "@/components/layout/command-menu-context";
import { CommandMenu } from "@/components/layout/CommandMenu";

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Impulse - The reference for every AI model",
    template: "%s · Impulse",
  },
  description:
    "Discover, compare and understand every AI model in one place. A fast, keyboard-first reference for AI providers and models.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <QueryProvider>
          <CommandMenuProvider>
            {children}
            <CommandMenu />
          </CommandMenuProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
