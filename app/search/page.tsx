import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import HorizontalSurveyRow from '@/components/HorizontalSurveyRow';

export default async function SearchPage({
  searchParams,
}: {
  // Next.js 16: searchParams は非同期（Promise）
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const results = query
    ? await new SurveyService(supabase).searchSurveys(profile.id, query)
    : [];

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* 検索フォーム（GETでこのページに再アクセス＝サーバー側で再ランキング） */}
        <form action="/search" method="get" className="mb-6">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="アンケートを検索…"
              className="w-full rounded-full border border-brand-100 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </form>

        {query === '' ? (
          <div className="card-3d mt-4 flex flex-col items-center px-4 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-500">
              <Search className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-slate-800">キーワードでアンケートを探す</p>
            <p className="mt-2 text-xs text-slate-500">
              タイトル・説明・設問の内容から、関連度の高い順に表示します。
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="card-3d mt-4 flex flex-col items-center px-4 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Search className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              「{query}」に一致するアンケートは見つかりませんでした
            </p>
            <p className="mt-2 text-xs text-slate-500">
              別のキーワードでもう一度お試しください。
            </p>
          </div>
        ) : (
          <>
            <HorizontalSurveyRow
              title={`「${query}」の検索結果`}
              description={`関連度の高い順に${results.length}件`}
              surveys={results}
              layout="grid"
            />
          </>
        )}
      </main>
    </>
  );
}
