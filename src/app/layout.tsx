import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T2D2C Workspace",
  description: "Text-to-Design-to-Code — AI 驱动的 UI 生成工作台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
