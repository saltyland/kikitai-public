'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { PointLotRepository } from '@/lib/repositories/pointLotRepository';
import type { PrivateField } from '@/lib/types/database';

export interface OnboardingActionState {
  error: string | null;
  success?: boolean;
}

/** 属性記入（プロフィール完成）で付与するポイント。1回限り。 */
const PROFILE_COMPLETE_BONUS = 30;

/** 属性を全員必須で記入してもらい、プロフィール完成ボーナス 30pt を付与する（1回限り） */
export async function completeOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  const str = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v || null;
  };

  const nickname = String(formData.get('nickname') ?? '').trim();
  if (!nickname) return { error: 'ニックネームは必須です' };

  const birthday = str('birthday');
  const age = (() => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a >= 0 && a <= 120 ? a : null;
  })();

  // 属性は全員必須（生年月日・性別・職業）。未入力なら保存しない。
  const gender = str('gender');
  const occupation = str('occupation');
  if (!birthday || !gender || !occupation) {
    return { error: '生年月日・性別・職業は必須です' };
  }

  const privateFields = formData
    .getAll('private_fields')
    .map((v) => String(v)) as PrivateField[];

  const service = new ProfileService(supabase);

  try {
    await service.updateProfile(user.id, {
      nickname,
      affiliation: str('affiliation'),
      field: str('field'),
      age,
      birthday,
      gender,
      occupation,
      grade: str('grade'),
      major: str('major'),
      private_fields: privateFields,
    });

    // プロフィール完成ボーナス +30pt（1回限り。既に付与済みなら再付与しない）。
    // 公開/非公開の設定とは無関係に、属性を記入したこと自体に付与する。
    const pointLotRepo = new PointLotRepository(supabase);
    const lots = await pointLotRepo.listActive(user.id);
    if (!lots.some((l) => l.reason === 'profile_complete')) {
      await pointLotRepo.grant(user.id, PROFILE_COMPLETE_BONUS, 'profile_complete', 180);
      await pointLotRepo.syncBalance(user.id);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '保存に失敗しました' };
  }

  return { error: null, success: true };
}
