'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import { parseJsonWith, surveyInputSchema } from '@/lib/domain/schemas';
import type { SurveyInput } from '@/lib/types/database';
import { SurveyStateMachine } from '@/lib/domain/surveyStateMachine';
import { NotificationService } from '@/lib/services/notificationService';
import { BusinessRuleError } from '@/lib/repositories/dbError';

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

  // 構文チェックだけでなく zod で構造・型も検証する（改ざんされた payload を弾く）
  // config は部分的に省略可能（サービス層でデフォルト値を補完）なため as でキャストする
  const input = parseJsonWith(surveyInputSchema, payloadRaw) as SurveyInput | null;
  if (!input) {
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
  const statusRaw = String(formData.get('status') ?? '');

  // 無検証の as キャストはしない。型ガードで正当な値だけ通す。
  if (!SurveyStateMachine.isStatus(statusRaw)) {
    redirect(`/?statusError=${encodeURIComponent('不正なステータス値です')}`);
    return;
  }
  const status = statusRaw;

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) {
    redirect('/login');
    return;
  }

  try {
    await new SurveyService(supabase).changeStatus(user.id, surveyId, status);
  } catch (e) {
    // 残高不足での公開失敗は通知センターにも残す（要件1-7）
    if (e instanceof BusinessRuleError && e.code === 'INSUFFICIENT_POINTS') {
      await new NotificationService(supabase).notifyPointsLow(user.id, e.details[0]);
    }
    // 残高不足（INSUFFICIENT_POINTS）等はホームにメッセージ付きで戻す
    const message = e instanceof Error ? e.message : '操作に失敗しました';
    revalidatePath('/');
    redirect(`/?statusError=${encodeURIComponent(message)}`);
  }
  revalidatePath('/');
}

export async function deleteSurveyAction(formData: FormData): Promise<void> {
  const surveyId = String(formData.get('surveyId') ?? '');

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) {
    redirect('/login');
    return;
  }

  await new SurveyService(supabase).deleteSurvey(user.id, surveyId);
  revalidatePath('/');
}
