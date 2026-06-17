'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import { answerListSchema, parseJsonWith } from '@/lib/domain/schemas';

export interface ResponseActionState {
  error: string | null;
  /** 低品質判定で保存せず差し戻した場合のフィードバック（再回答を促す） */
  rejectedFeedback?: string | null;
}

export async function submitResponseAction(
  _prev: ResponseActionState,
  formData: FormData
): Promise<ResponseActionState> {
  const surveyId = String(formData.get('surveyId') ?? '');
  const payloadRaw = String(formData.get('payload') ?? '');
  // 回答所要時間（秒）。クライアント計測のため参考値（不正回答検出の一材料）。
  const durationRaw = Number(formData.get('durationSec'));
  const durationSec =
    Number.isFinite(durationRaw) && durationRaw >= 0 ? Math.round(durationRaw) : undefined;
  // 低品質差し戻し後の「このまま送信する」再送信フラグ
  const acceptLowQuality = formData.get('acceptLowQuality') === '1';

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
    result = await new ResponseService(supabase).submitResponse(user.id, surveyId, answers, {
      durationSec,
      acceptLowQuality,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : '回答の送信に失敗しました' };
  }

  // 低品質判定：保存せず差し戻し、内容の見直し（または受け入れての再送信）を促す
  if (result.rejected) {
    return { error: null, rejectedFeedback: result.feedback };
  }

  revalidatePath('/surveys');
  // 品質スコア・付与ポイント・アドバイスを結果画面に渡す
  const params = new URLSearchParams({
    score: String(result.score),
    pts: String(result.earnedPoints),
  });
  if (result.feedback) params.set('feedback', result.feedback);
  if (result.surveyClosed) params.set('closed', '1');
  redirect(`/answered?${params.toString()}`);
}

/**
 * 共有リンク（/s/<token>）からのログイン済み回答送信。
 * share_link_no_reward が true の場合は0ptで保存し、それ以外は品質評価付き通常送信。
 */
export async function submitSharedLinkResponseAction(
  _prev: ResponseActionState,
  formData: FormData
): Promise<ResponseActionState> {
  const shareToken = String(formData.get('shareToken') ?? '');
  const payloadRaw = String(formData.get('payload') ?? '');
  const durationRaw = Number(formData.get('durationSec'));
  const durationSec =
    Number.isFinite(durationRaw) && durationRaw >= 0 ? Math.round(durationRaw) : undefined;
  const acceptLowQuality = formData.get('acceptLowQuality') === '1';

  if (!/^[a-f0-9]{16,64}$/.test(shareToken)) {
    return { error: 'アンケートが見つかりません' };
  }
  const answers = parseJsonWith(answerListSchema, payloadRaw);
  if (!answers) {
    return { error: '回答データの形式が不正です' };
  }

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  let result;
  try {
    result = await new ResponseService(supabase).submitSharedLinkResponse(
      user.id,
      shareToken,
      answers,
      { durationSec, acceptLowQuality }
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : '回答の送信に失敗しました' };
  }

  if (result.rejected) {
    return { error: null, rejectedFeedback: result.feedback };
  }

  revalidatePath('/surveys');
  const params = new URLSearchParams({
    score: String(result.score),
    pts: String(result.earnedPoints),
  });
  if (result.feedback) params.set('feedback', result.feedback);
  if (result.surveyClosed) params.set('closed', '1');
  redirect(`/answered?${params.toString()}`);
}
