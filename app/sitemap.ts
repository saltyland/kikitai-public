import type { MetadataRoute } from 'next';

const BASE = 'https://kikitai.vercel.app';

/** 検索エンジンに載せたい公開ページのみを列挙する静的サイトマップ */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/intelligence`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE}/register`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/operator`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
