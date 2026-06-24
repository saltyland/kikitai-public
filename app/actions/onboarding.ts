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

/** プロフィール登録アンケートを完了し、20pt × 1.5倍 = 30pt を付与する */
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
      gender: str('gender'),
      occupation: str('occupation'),
      grade: str('grade'),
      major: str('major'),
      private_fields: privateFields,
    });

    // オンボーディングプロフィールアンケート完了ボーナス: 20pt × 1.5倍 = 30pt
    const pointLotRepo = new PointLotRepository(supabase);
    await pointLotRepo.grant(user.id, 30, 'survey_answer', 180);
    await pointLotRepo.syncBalance(user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : '保存に失敗しました' };
  }

  return { error: null, success: true };
}
