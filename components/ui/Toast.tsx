'use client';

import { useEffect, useState } from 'react';

/**
 * 画面下部中央に出る一時的な通知トースト。
 * nonce が変わるたびに表示し、数秒後に自動で消える。
 * フォーム下部だけに成功メッセージを出すとスクロール時に見えないため、固定表示にする。
 */
export default function Toast({
  nonce,
  message,
  tone = 'success',
}: {
  /** 変化するたびにトーストを再表示するためのカウンタ */
  nonce: number;
  message: string;
  tone?: 'success' | 'error';
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!nonce) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [nonce]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={`kikitai-slide-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg ${
        tone === 'success' ? 'bg-brand-600' : 'bg-red-600'
      }`}
    >
      ✓ {message}
    </div>
  );
}
