/** ニックネームから決定的にアバター色を選ぶ（毎回同じ色になる） */
const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-brand-600',
  'bg-brand-500',
  'bg-violet-500',
  'bg-fuchsia-500',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initial(name: string): string {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

/**
 * ユーザーアバター。画像URLがあれば画像を、無ければニックネームのイニシャルを
 * 色付きの丸で表示する。サイズは Tailwind のクラスで上書き可能。
 */
export default function Avatar({
  name,
  src,
  className = 'h-10 w-10 text-base',
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover shadow-sm ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${avatarColor(name)} ${className}`}
      aria-hidden
    >
      {initial(name)}
    </div>
  );
}
