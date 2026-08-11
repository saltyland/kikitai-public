import { cn } from '@/lib/utils';

/**
 * 向かい合う2つの「K」と吹き出しで、問いと回答の循環を表すブランドマーク。
 * ブランドカラーをマーク自体に持たせ、どの画面でも一貫して認識できるようにする。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="kikitai-mark-gradient" x1="5" y1="4" x2="44" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16C7A0" />
          <stop offset="0.52" stopColor="#159E91" />
          <stop offset="1" stopColor="#2879D0" />
        </linearGradient>
        <linearGradient id="kikitai-shine-gradient" x1="12" y1="9" x2="35" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.34" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="14" fill="url(#kikitai-mark-gradient)" />
      <path d="M11 7.8C17.7 3.3 30.6 3.1 38.2 9.4L10.4 37.2C5.4 29.1 6.1 15.5 11 7.8Z" fill="url(#kikitai-shine-gradient)" />
      <path
        d="M14.2 14.5h19.6c2 0 3.7 1.7 3.7 3.7v10c0 2-1.7 3.7-3.7 3.7h-8.7L19 36.4v-4.5h-4.8c-2 0-3.7-1.7-3.7-3.7v-10c0-2 1.7-3.7 3.7-3.7Z"
        stroke="white"
        strokeWidth="2.35"
        strokeLinejoin="round"
      />
      <path d="M17.5 19.5v7.3M17.7 23.4l5-3.9M17.7 23.4l5 3.4" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.5 19.5v7.3M30.3 23.4l-5-3.9M30.3 23.4l-5 3.4" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.78" />
      <circle cx="37.5" cy="10.5" r="3.2" fill="#B9F4E1" stroke="white" strokeWidth="1.4" />
    </svg>
  );
}

/** ロゴマーク＋ワードマーク（ヘッダー等で使用） */
export default function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-[#14231e]', className)}>
      <LogoMark className="h-8 shrink-0" />
      <span className="text-[1.18rem] font-black tracking-[-0.075em]">
        キキ<span className="text-[#159e91]">タイ</span>
      </span>
    </span>
  );
}
