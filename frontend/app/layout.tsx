import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ads Checker - Dashboard",
  description: "Meta広告ダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
