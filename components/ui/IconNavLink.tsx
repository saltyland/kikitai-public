import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * アイコン+ラベルのナビゲーションリンク。
 * `showLabel`がfalse（既定）のときはアイコンのみ表示し、ホバー/フォーカス時に
 * CSSのみでツールチップ（ラベル）を表示する。`showLabel`がtrueのときは
 * アイコンの横にラベルを常時表示する（モバイルメニュー向け）。
 */
export default function IconNavLink({
  href,
  label,
  icon: Icon,
  showLabel = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  showLabel?: boolean;
  onClick?: () => void;
}) {
  if (showLabel) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 rounded-md px-2 py-2 text-slate-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="group relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </Link>
  );
}
