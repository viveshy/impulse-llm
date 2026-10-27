import { ImageResponse } from "next/og";

export const alt = "Impulse: AI model prices, releases and retirements";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card a shared link shows, in the light theme's colours; built once at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f6f6f3",
          color: "#18181b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* The impulse mark, as src/app/icon.svg draws it. */}
          <svg width="88" height="88" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="6.5" fill="#4338ca" />
            <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4.8" y1="5.8" x2="14.8" y2="12" />
              <line x1="4.8" y1="12" x2="14.8" y2="12" />
              <line x1="4.8" y1="18.2" x2="14.8" y2="12" />
            </g>
            <g fill="#ffffff">
              <circle cx="4.8" cy="5.8" r="1.65" />
              <circle cx="4.8" cy="12" r="1.65" />
              <circle cx="4.8" cy="18.2" r="1.65" />
              <path d="M14.8 6.2C14.8 10.144 16.656 12 20.6 12C16.656 12 14.8 13.856 14.8 17.8C14.8 13.856 12.944 12 9 12C12.944 12 14.8 10.144 14.8 6.2Z" />
            </g>
          </svg>
          <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.03em" }}>Impulse</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.035em", maxWidth: 980 }}>
            AI model prices, releases and retirements
          </div>
          <div style={{ fontSize: 30, color: "#52525b", maxWidth: 980, lineHeight: 1.35 }}>
            Every frontier model&apos;s price on every host, cheaper alternatives, and when each one retires.
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#4338ca" }}>impulse.viveshy.com</div>
      </div>
    ),
    size,
  );
}
