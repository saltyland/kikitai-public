import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親フォルダにも package-lock.json があるため、Turbopack の
  // ワークスペースルート誤検出を防いでこのプロジェクト直下に固定する。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
