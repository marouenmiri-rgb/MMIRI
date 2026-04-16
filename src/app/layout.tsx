import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdGen AI — AI-generated video ads for Shopify stores",
  description:
    "Turn any product URL into a high-converting short-form video ad. Find Shopify stores. Run personalized outreach. All from one clean dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
