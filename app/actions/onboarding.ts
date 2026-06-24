'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { TopicService } from '@/lib/services/topicService';
import { PointLotRepository } from '@/lib/repositories/pointLotRepository';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import type { PrivateField } from '@/lib/types/database';

export interface OnboardingActionState {
  error: string | null;
  success?: boolean;
}

/** 学年入力が必要な職業と、その学年の選択肢一覧 */
const GRADE_OPTIONS: Record<string, string[]> = {
  '中学生': ['1年', '2年', '3年'],
  '高校生': ['1年', '2年', '3年'],
  '学部生': ['1年', '2年', '3年', '4年'],
  '大学院生（修士）': ['M1', 'M2'],
  '大学院生（博士）': ['D1', 'D2', 'D3以上'],
};

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
  if (!birthday) return { error: '生年月日は必須です' };

  const gender = str('gender');
  if (!gender) return { error: '性別は必須です' };

  const occupation = str('occupation');
  if (!occupation) return { error: '職業・立場は必須です' };

  const grade = str('grade');
  if (GRADE_OPTIONS[occupation] && !grade) return { error: '学年は必須です' };

  const affiliation = str('affiliation');
  if (!affiliation) return { error: '所属機関・大学名は必須です' };

  const field = str('field');
  if (!field) return { error: '研究分野・専攻は必須です' };

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
      affiliation,
      field,
      age,
      birthday,
      gender,
      occupation,
      grade,
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

export interface SaveTopicSelectionState {
  error: string | null;
}

/**
 * オンボーディングのトピック選択を保存する。
 * 選択されたトピックを一括フォローし、profiles.topics_selected_at を現在時刻に更新する。
 * フォロー登録に失敗した場合は topics_selected_at を更新せず、再訪時に
 * このステップが再表示される（再試行可能）状態を維持する。
 */
export async function saveTopicSelectionAction(topicIds: string[]): Promise<SaveTopicSelectionState> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  try {
    if (topicIds.length > 0) {
      await new TopicService(supabase).followTopics(user.id, topicIds);
    }
    await new ProfileRepository(supabase).update(user.id, {
      topics_selected_at: new Date().toISOString(),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'トピックの保存に失敗しました' };
  }

  return { error: null };
}
