import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

// 日本語の丸ゴシック体。親しみやすさと信頼感を両立（DESIGN_SPEC 準拠）。
const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "キキタイ｜学術アンケート交換プラットフォーム",
  description: "学生・研究者が互いにアンケートに回答し合うP2P型アンケート交換サービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={rounded.variable}>
      <body className="relative flex min-h-screen flex-col overflow-x-hidden font-sans antialiased">
        {/* 背景の浮遊ブロブ（design_export 準拠） */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="absolute right-[-8rem] top-40 h-[28rem] w-[28rem] rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}
