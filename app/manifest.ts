import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'キキタイ｜アンケート交換サービス',
    short_name: 'キキタイ',
    description: '学生・研究者が互いに回答し合う、ポイント制アンケート交換サービス。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fbf9',
    theme_color: '#159e91',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
