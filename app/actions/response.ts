'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import { answerListSchema, parseJsonWith } from '@/lib/domain/schemas';

export interface ResponseActionState {
  error: string | null;
}

export async function submitResponseAction(
  _prev: ResponseActionState,
  formData: FormData
): Promise<ResponseActionState> {
  const surveyId = String(formData.get('surveyId') ?? '');
  const payloadRaw = String(formData.get('payload') ?? '');

  // 構文チェックだけでなく zod で構造・型も検証する（改ざんされた payload を弾く）
  const answers = parseJsonWith(answerListSchema, payloadRaw);
  if (!answers) {
    return { error: '回答データの形式が不正です' };
  }

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  let result;
  try {
    result = await new ResponseService(supabase).submitResponse(user.id, surveyId, answers);
  } catch (e) {
    return { error: e instanceof Error ? e.message : '回答の送信に失敗しました' };
  }

  revalidatePath('/surveys');
  // 品質スコアと付与ポイントをホームに渡して結果を伝える
  const params = new URLSearchParams({
    answered: '1',
    score: String(result.score),
    pts: String(result.earnedPoints),
  });
  redirect(`/?${params.toString()}`);
}
