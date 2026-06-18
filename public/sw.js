// キキタイ Service Worker
// 役割：
//  1) オフライン時でもアプリ殻を表示できるよう最低限のキャッシュを持つ。
//  2) Background Sync（'kikitai-submit'）で復帰時にクライアントへ再送信を促す。
// 回答送信自体は Next.js のサーバーアクション経由のため、実際の再送はクライアントが行う。
// SW は「オンライン復帰の合図」をクライアントへ配信する役割に徹する。

const CACHE = 'kikitai-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ナビゲーションはネットワーク優先、失敗時はキャッシュにフォールバック
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});

// Background Sync：復帰時に全クライアントへ再送信を依頼するメッセージを送る
self.addEventListener('sync', (event) => {
  if (event.tag === 'kikitai-submit') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'kikitai-retry-submit' }));
      })
    );
  }
});
