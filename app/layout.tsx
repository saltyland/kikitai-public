import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import NetworkBackdrop from "@/components/NetworkBackdrop";

// 日本語の丸ゴシック体。親しみやすさと信頼感を両立（DESIGN_SPEC 準拠）。
const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const SITE_NAME = "キキタイ";
const SITE_DESC =
  "学生・研究者が互いにアンケートに回答し合い、ポイントで自分の調査に回答者を集められるアンケート交換サービス。";

export const metadata: Metadata = {
  metadataBase: new URL("https://kikitai.vercel.app"),
  title: {
    default: "キキタイ｜みんなで回答し合うアンケート交換サービス",
    template: "%s｜キキタイ",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "キキタイ｜みんなで回答し合うアンケート交換サービス",
    description: SITE_DESC,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "キキタイ｜みんなで回答し合うアンケート交換サービス",
    description: SITE_DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={rounded.variable}>
      <body className="relative flex min-h-screen flex-col overflow-x-hidden font-sans antialiased">
        {/* ビューポートに固定される抽象ネットワーク背景（GameFreak風）。
            アンケートで人と人がつながる輪を全ページ共通の世界観として敷く。 */}
        <NetworkBackdrop />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
