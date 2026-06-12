'use server';

import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResponseService } from '@/lib/services/responseService';
import { answerListSchema, parseJsonWith } from '@/lib/domain/schemas';

export interface GuestResponseActionState {
  error: string | null;
  /** ゲスト回答ではAI品質評価を行わないため常に未設定（ログイン回答と型を揃えるため） */
  rejectedFeedback?: string | null;
}

/** ゲスト識別Cookie名。同一ブラウザからの重複回答防止に使う。 */
const GUEST_KEY_COOKIE = 'kikitai-guest-key';

/**
 * 共有リンク（/s/<token>）からのゲスト回答送信。
 * ログイン不要・ポイント付与なし。重複回答はゲストキー（Cookie）単位で防止する。
 */
export async function submitGuestResponseAction(
  _prev: GuestResponseActionState,
  formData: FormData
): Promise<GuestResponseActionState> {
  const token = String(formData.get('shareToken') ?? '');
  const payloadRaw = String(formData.get('payload') ?? '');
  const durationRaw = Number(formData.get('durationSec'));
  const durationSec =
    Number.isFinite(durationRaw) && durationRaw >= 0 ? Math.round(durationRaw) : undefined;

  if (!/^[a-f0-9]{16,64}$/.test(token)) {
    return { error: 'アンケートが見つかりません' };
  }
  const answers = parseJsonWith(answerListSchema, payloadRaw);
  if (!answers) {
    return { error: '回答データの形式が不正です' };
  }

  // ゲストキー：なければ発行してCookieに保存する（1年）
  const cookieStore = await cookies();
  let guestKey = cookieStore.get(GUEST_KEY_COOKIE)?.value ?? '';
  if (!/^[a-f0-9]{32}$/.test(guestKey)) {
    guestKey = randomBytes(16).toString('hex');
    cookieStore.set(GUEST_KEY_COOKIE, guestKey, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  const supabase = await createSupabaseServerClient();
  let surveyClosed = false;
  try {
    const result = await new ResponseService(supabase).submitGuestResponse(
      token,
      answers,
      guestKey,
      durationSec
    );
    surveyClosed = result.surveyClosed;
  } catch (e) {
    return { error: e instanceof Error ? e.message : '回答の送信に失敗しました' };
  }

  redirect(`/s/${token}?done=1${surveyClosed ? '&closed=1' : ''}`);
}
