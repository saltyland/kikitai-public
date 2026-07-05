'use client';

import Script from 'next/script';

/**
 * Cloudflare Turnstile ウィジェット。
 *
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY が設定されている場合のみ描画する。
 * 未設定なら何も表示せず（null）、フォームは従来どおり動作する（導入前でも壊れない）。
 *
 * Turnstile は成功時に、囲っている <form> 内へ name="cf-turnstile-response" の
 * hidden input を自動挿入する。サーバーアクション側はこの値を検証する。
 */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className="cf-turnstile flex justify-center"
        data-sitekey={siteKey}
        data-size="flexible"
        data-appearance="interaction-only"
      />
    </>
  );
}
