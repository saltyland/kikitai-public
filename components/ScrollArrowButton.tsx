'use client';

/** 横スクロール行の左右矢印ボタン（PCのみ表示・disabled時は非表示） */
export default function ScrollArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? '左にスクロール' : '右にスクロール'}
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 text-slate-600 shadow-md transition-opacity sm:flex ${
        direction === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      } ${disabled ? 'pointer-events-none opacity-0' : 'opacity-40 group-hover:opacity-100 group-focus-within:opacity-100'}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        {direction === 'left' ? (
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z"
            clipRule="evenodd"
          />
        )}
      </svg>
    </button>
  );
}
