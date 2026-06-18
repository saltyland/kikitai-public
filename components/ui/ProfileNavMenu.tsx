import Link from 'next/link';
import Avatar from '@/components/Avatar';

/** ヘッダーのアバターアイコン。クリックでマイページへ遷移する */
export default function ProfileNavMenu({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl?: string | null;
}) {
  return (
    <Link
      href="/profile"
      aria-label="マイページ"
      className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Avatar name={nickname} src={avatarUrl} className="h-8 w-8 text-xs" />
    </Link>
  );
}
