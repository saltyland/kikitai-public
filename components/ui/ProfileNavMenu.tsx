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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73eadb]"
    >
      <Avatar name={nickname} src={avatarUrl} className="h-8 w-8 text-xs" />
    </Link>
  );
}
