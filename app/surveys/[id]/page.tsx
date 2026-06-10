import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import Header from '@/components/Header';
import AnswerForm from '@/components/AnswerForm';

export default async function AnswerSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  let survey;
  let errorMsg: string | null = null;
  try {
    survey = await new ResponseService(supabase).getSurveyForAnswer(profile.id, id);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'アンケートを取得できませんでした';
  }

  return (
    <>
      <Header nickname={profile.nickname} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {errorMsg || !survey ? (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
            <p className="text-sm font-medium text-red-700">
              {errorMsg ?? 'アンケートが見つかりません'}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              アンケートが削除・終了されたか、すでに回答済みの可能性があります。
            </p>
            <Link href="/surveys" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
              回答できるアンケート一覧に戻る →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-zinc-800">{survey.title}</h1>
            {survey.description && (
              <p className="mb-6 text-sm text-zinc-600">{survey.description}</p>
            )}
            <AnswerForm survey={survey} />
          </>
        )}
      </main>
    </>
  );
}
