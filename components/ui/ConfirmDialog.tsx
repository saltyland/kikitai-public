'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 処理中（多重実行防止＋ボタン無効化） */
  pending?: boolean;
  /** 削除・退会など取り消せない操作は true。確認ボタンを赤系にする。 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 破壊的操作の確認モーダル。`window.confirm` の代替。
 * role="dialog" / aria-modal でスクリーンリーダーに伝え、開いたら確認ボタンに
 * フォーカスを移し、Escape・背景クリックでキャンセルできるようにする。
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  pending = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 開いたら確認ボタンへフォーカスを移す
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Escapeでキャンセル
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className={`text-lg font-bold ${danger ? 'text-red-700' : 'text-zinc-800'}`}
        >
          {title}
        </h2>
        <div className="mt-2 text-sm text-zinc-600">{message}</div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500'
            }`}
          >
            {pending ? '処理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
