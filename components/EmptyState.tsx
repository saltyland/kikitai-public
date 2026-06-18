import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';

/**
 * 共通の空状態。絵文字ではなくブランドのロゴマーク（2人モチーフ）を使い、
 * 「まだ誰もいない」ではなく「これから始めよう」という前向きな誘導にする。
 * actions（ボタン等）は children で渡す。
 */
export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card-3d flex flex-col items-center px-6 py-12 text-center">
      <LogoMark className="h-16 w-auto text-brand-300" />
      <p className="mt-4 text-base font-bold text-slate-800">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}
