'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** ヘッダー用検索バー（PC表示のみ。モバイルはHeaderMobileMenu内のアイコンリンク） */
export default function HeaderSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="アンケートを検索..."
          className="w-full rounded-full border border-brand-100 bg-white/80 py-1.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>
    </form>
  );
}
