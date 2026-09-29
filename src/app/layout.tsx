import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaProvider } from "@/components/PwaProvider";

export const metadata: Metadata = {
  title: "AdGen — The AI ad lab for Shopify",
  description:
    "Paste a product URL. Watch a five-agent pipeline turn it into a short-form video ad. Find stores that need it. Ship outreach. All from one control room.",
  manifest: "/manifest.webmanifest",
  applicationName: "AdGen",
  appleWebApp: { capable: true, title: "AdGen", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Applies the saved appearance before first paint, so the page never flashes a
 * different theme, density or corner radius during hydration. Kept in sync
 * with src/lib/appearance.ts — it reads the same record and writes the same
 * attributes, just early and without React.
 */
const appearanceScript = `
(function () {
  var el = document.documentElement;
  var A = { palette: ['studio','noir','aurora'], mode: ['light','dark','system'],
            density: ['compact','comfortable','spacious'], radius: ['sharp','soft','round'],
            motion: ['full','reduced'] };
  var D = { palette: 'studio', mode: 'system', density: 'comfortable', radius: 'soft', motion: 'full' };
  var s = D;
  try {
    var raw = JSON.parse(localStorage.getItem('adgen-appearance') || '{}');
    for (var k in A) s[k] = A[k].indexOf(raw[k]) > -1 ? raw[k] : D[k];
  } catch (e) {}
  var mode = s.mode;
  if (mode === 'system') {
    mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  el.setAttribute('data-theme', mode);
  el.setAttribute('data-palette', s.palette);
  el.setAttribute('data-density', s.density);
  el.setAttribute('data-radius', s.radius);
  el.setAttribute('data-motion', s.motion);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-palette="studio"
      data-density="comfortable"
      data-radius="soft"
      data-motion="full"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
