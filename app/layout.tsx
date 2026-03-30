import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxEngine",
  description: "Internal tax preparation engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-stone-900">{children}</body>
    </html>
  );
}
