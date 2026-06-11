import type { ReactNode } from 'react';

/**
 * フォーム項目のラベル。
 * 必須項目は視覚的な「*」に加えて、スクリーンリーダー向けに「（必須）」を読み上げさせる
 * （赤いアスタリスクは視覚情報のみで必須性が伝わらないため）。
 */
export function FormLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700 mb-1">
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
          <span className="sr-only">（必須）</span>
        </>
      )}
      {optional && <span className="ml-1 text-xs font-normal text-zinc-500">（任意）</span>}
    </label>
  );
}
