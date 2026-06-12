'use client';

import { useState } from 'react';

/**
 * 共有リンク（/s/<token>）をクリップボードへコピーするボタン。
 * リンクを知っている人はログイン不要のゲストとして回答できる（ポイント付与なし）。
 */
export default function ShareLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/s/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // クリップボードAPIが使えない環境（http等）はプロンプトで提示する
      window.prompt('以下のリンクをコピーしてください', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="btn-3d btn-3d-secondary px-3 py-1"
      title="リンクを知っている人はログインなしで回答できます（ポイント付与なし）"
    >
      {copied ? '✓ コピーしました' : '共有リンクをコピー'}
    </button>
  );
}
