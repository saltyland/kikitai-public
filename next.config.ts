import type { NextConfig } from "next";

// 全レスポンスに付与するセキュリティヘッダー。
// クリックジャッキング・MIMEスニッフィング・リファラ漏洩・不要な端末API露出を防ぐ。
const securityHeaders = [
  // HTTPS強制（1年・サブドメイン含む）。Vercelは常時HTTPSのため常に有効化してよい。
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // MIMEタイプの推測実行を禁止
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 他サイトへのiframe埋め込み（クリックジャッキング）を禁止
  { key: 'X-Frame-Options', value: 'DENY' },
  // クロスオリジン遷移時にリファラのパス・クエリを送らない
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 位置情報・カメラ・マイク等のブラウザAPIを既定で無効化
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // 親フォルダにも package-lock.json があるため、Turbopack の
  // ワークスペースルート誤検出を防いでこのプロジェクト直下に固定する。
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
