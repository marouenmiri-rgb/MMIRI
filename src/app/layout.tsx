import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdGen — The AI ad lab for Shopify",
  description:
    "Paste a product URL. Watch a five-agent pipeline turn it into a short-form video ad. Find stores that need it. Ship outreach. All from one control room.",
};

/**
 * Resolves the theme before first paint so the page never flashes the wrong
 * palette. Runs ahead of hydration, reads the saved choice, and falls back to
 * the OS preference.
 */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('adgen-theme');
    var theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
