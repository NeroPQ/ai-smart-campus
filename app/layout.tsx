import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Smart Campus — Đánh giá",
  description: "Pre-test, bài học và Post-test về sử dụng AI có trách nhiệm.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
