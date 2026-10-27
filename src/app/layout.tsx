import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { CommandMenuProvider } from "@/components/layout/command-menu-context";
import { Beacon } from "@/components/site/Beacon";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getDataSource } from "@/lib/data";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { SITE_URL } from "@/lib/routes";
import { SITE_DESCRIPTION } from "@/lib/seo";

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Impulse · AI model prices, releases and retirements",
    template: "%s · Impulse",
  },
  description: SITE_DESCRIPTION,
  alternates: { types: { "application/rss+xml": [{ url: "/releases/feed.xml", title: "Impulse releases" }] } },
  openGraph: { siteName: "Impulse", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

// Runs before first paint so a saved dark or system theme never flashes light.
const THEME_SCRIPT = `try{var t=localStorage.getItem("impulse-theme");if(t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;

/** Footer figures; a plain function so the request-time clock stays out of render. */
async function footerData() {
  const [summary, index] = await Promise.all([
    getDataSource().getAnalyticsSummary(30),
    getCatalogIndex().catch(() => null),
  ]);
  return { visits30d: summary?.totals.visitors ?? null, generatedAt: index?.generatedAt, now: Date.now() };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const footer = await footerData();
  return (
    <html lang="en" data-theme="light" className={spaceGrotesk.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <CommandMenuProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter {...footer} />
          <CommandMenu />
        </CommandMenuProvider>
        <Beacon />
      </body>
    </html>
  );
}
