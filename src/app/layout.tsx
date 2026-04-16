import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdGen — The AI ad lab for Shopify",
  description:
    "Paste a product URL. Watch a five-agent pipeline turn it into a short-form video ad. Find stores that need it. Ship outreach. All from one control room.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
