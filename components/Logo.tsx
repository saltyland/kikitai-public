import { cn } from '@/lib/utils';

/**
 * キキタイのロゴマーク。
 * 2人がチェックリストを見せ合うモチーフ（かわいい版：笑顔＋ほっぺ付き）。
 * 色は currentColor を継承するので `text-brand-600` 等で着色する。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto', className)}
      aria-hidden
    >
      {/* 左の人：頭 */}
      <circle cx="27" cy="25" r="12" stroke="currentColor" strokeWidth="5.5" />
      {/* 左の人：体（丸いおにぎり型） */}
      <path
        d="M9 88 C9 60 14 44 27 44 C40 44 45 60 45 88"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* 左の人：顔（目・笑顔・ほっぺ） */}
      <circle cx="23.5" cy="24" r="1.8" fill="currentColor" />
      <circle cx="31.5" cy="24" r="1.8" fill="currentColor" />
      <path
        d="M24 29 Q27.5 32 31 29"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="28" r="2" fill="currentColor" opacity="0.25" />
      <circle cx="35.5" cy="28" r="2" fill="currentColor" opacity="0.25" />
      {/* 左の人：腕 */}
      <path
        d="M30 58 Q40 64 48 60"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* 左のクリップボード（内側に傾く） */}
      <g transform="rotate(8 56 58)">
        <rect x="46" y="42" width="20" height="28" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
        <rect x="52.5" y="38.5" width="7" height="6" rx="2.5" fill="currentColor" />
        <path d="M51.5 51 l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M51.5 60 l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* 右のクリップボード */}
      <g transform="rotate(-8 72 58)">
        <rect x="62" y="42" width="20" height="28" rx="4.5" stroke="currentColor" strokeWidth="4.5" />
        <rect x="68.5" y="38.5" width="7" height="6" rx="2.5" fill="currentColor" />
        <path d="M67.5 51 l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M67.5 60 l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* 右の人：腕 */}
      <path
        d="M98 58 Q88 64 80 60"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* 右の人：頭 */}
      <circle cx="101" cy="25" r="12" stroke="currentColor" strokeWidth="5.5" />
      {/* 右の人：体 */}
      <path
        d="M83 88 C83 60 88 44 101 44 C114 44 119 60 119 88"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* 右の人：顔 */}
      <circle cx="97.5" cy="24" r="1.8" fill="currentColor" />
      <circle cx="105.5" cy="24" r="1.8" fill="currentColor" />
      <path
        d="M98 29 Q101.5 32 105 29"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="93.5" cy="28" r="2" fill="currentColor" opacity="0.25" />
      <circle cx="109.5" cy="28" r="2" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

/** ロゴマーク＋ワードマーク（ヘッダー等で使用） */
export default function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-brand-600', className)}>
      <LogoMark className="h-7" />
      <span className="text-lg font-extrabold tracking-tight">キキタイ</span>
    </span>
  );
}
