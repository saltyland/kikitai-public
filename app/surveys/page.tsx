import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';

export default async function SurveyListPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  const surveys = await new SurveyService(supabase).listAnswerableSurveys(profile.id);

  return (
    <>
      <Header nickname={profile.nickname} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-zinc-800">回答できるアンケート</h1>
        {surveys.length === 0 ? (
          <p className="rounded-lg bg-white border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
            現在、回答できるアンケートはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => {
              const remaining = Math.max(0, s.required_count - s.response_count);
              return (
                <li key={s.id} className="rounded-lg bg-white border border-zinc-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-zinc-800">{s.title}</h3>
                      {s.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{s.description}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        投稿者 {s.author_nickname} ・残り {remaining}枠
                        {s.deadline && ` ・期限 ${s.deadline}`}
                      </p>
                    </div>
                    <Link
                      href={`/surveys/${s.id}`}
                      className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      回答する
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
