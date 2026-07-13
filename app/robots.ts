import type { MetadataRoute } from 'next';

/**
 * 検索エンジン向けのクロール制御。
 * 公開ページ（LP・AI評価の仕組み・ヘルプ・法務ページ）のみ許可し、
 * ログイン後のページや限定公開アンケート（/s/）はインデックスさせない。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/s/', // 限定公開アンケート（リンクを知っている人だけに公開）
          '/surveys',
          '/manage',
          '/points',
          '/notifications',
          '/profile',
          '/onboarding',
          '/answered',
          '/search',
          '/users',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://kikitai.vercel.app/sitemap.xml',
  };
}
