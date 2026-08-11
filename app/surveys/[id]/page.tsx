import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import { getLocalEncoder } from '@/lib/domain/quality/embedding/factory';
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

  // 埋め込みエンコーダのプリロード（コールドスタート対策）：
  // ユーザーが設問に回答している間にモデルロードを終わらせておくことで、
  // 送信時の待ち時間から初回ロード分が消える。await しない・失敗しても回答フローに影響しない。
  void getLocalEncoder().catch((e) => {
    console.warn('[AnswerSurveyPage] エンコーダのプリロードに失敗（回答フローには影響なし）:', e);
  });

  let survey;
  let errorMsg: string | null = null;
  try {
    survey = await new ResponseService(supabase).getSurveyForAnswer(profile.id, id);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'アンケートを取得できませんでした';
  }

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="app-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {errorMsg || !survey ? (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
            <p className="text-sm font-medium text-red-700">
              {errorMsg ?? 'アンケートが見つかりません'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              アンケートが削除・終了されたか、すでに回答済みの可能性があります。
            </p>
            <Link href="/surveys" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
              回答できるアンケート一覧に戻る →
            </Link>
          </div>
        ) : (
          <div className="app-answer-workspace">
            <div className="app-answer-title">
              <p className="app-kicker">Answer session</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{survey.title}</h1>
            {survey.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{survey.description}</p>
            )}
            </div>
            <AnswerForm survey={survey} userId={profile.id} />
          </div>
        )}
      </main>
    </>
  );
}
