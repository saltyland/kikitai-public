'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import type { SurveyInput, SurveyStatus } from '@/lib/types/database';

export interface SurveyActionState {
  error: string | null;
}

/**
 * クライアントから送られるアンケート入力（JSON文字列）をパースして保存する。
 * 新規作成・編集の両方をこの1関数で扱う（surveyIdがあれば編集）。
 */
export async function saveSurveyAction(
  _prev: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  const surveyId = formData.get('surveyId') ? String(formData.get('surveyId')) : null;
  const payloadRaw = String(formData.get('payload') ?? '');

  let input: SurveyInput;
  try {
    input = JSON.parse(payloadRaw) as SurveyInput;
  } catch {
    return { error: '入力データの形式が不正です' };
  }

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  const service = new SurveyService(supabase);
  try {
    if (surveyId) {
      await service.updateSurvey(user.id, surveyId, input);
    } else {
      await service.createSurvey(user.id, input);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '保存に失敗しました' };
  }

  revalidatePath('/');
  redirect('/');
}

export async function changeStatusAction(formData: FormData): Promise<void> {
  const surveyId = String(formData.get('surveyId') ?? '');
  const status = String(formData.get('status') ?? '') as SurveyStatus;

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) redirect('/login');

  await new SurveyService(supabase).changeStatus(user!.id, surveyId, status);
  revalidatePath('/');
}

export async function deleteSurveyAction(formData: FormData): Promise<void> {
  const surveyId = String(formData.get('surveyId') ?? '');

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) redirect('/login');

  await new SurveyService(supabase).deleteSurvey(user!.id, surveyId);
  revalidatePath('/');
}
