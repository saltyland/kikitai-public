import type { Profile, TargetConditions } from '@/lib/types/database';

/**
 * 属性マッチング配信（要件：学術的に意味のある回答者集め）。
 *
 * アンケートの target_conditions と回答者プロフィールを突き合わせ、
 * 条件を満たす場合のみ一覧に配信する。
 *
 * 逆インセンティブ設計：回答者が該当属性を非公開（private_fields）にしている
 * 場合、その属性は「不明」としてマッチング対象外＝条件を満たさない扱いになる
 * （非公開のボーナスと引き換えにターゲティング配信を受けられない）。
 */
type MatchableProfile = Pick<Profile, 'age' | 'gender' | 'occupation' | 'private_fields'>;

/** 条件が実質未設定（全員に配信）か */
export function isUnrestricted(conditions: TargetConditions | null | undefined): boolean {
  if (!conditions) return true;
  return (
    conditions.ageMin == null &&
    conditions.ageMax == null &&
    !(conditions.genders?.length) &&
    !(conditions.occupations?.length)
  );
}

/** プロフィールが配信条件を満たすか（SQL粗フィルタ後のドメイン厳密判定） */
export function matches(
  profile: MatchableProfile,
  conditions: TargetConditions | null | undefined
): boolean {
  if (isUnrestricted(conditions)) return true;
  const c = conditions as TargetConditions;
  const isPrivate = (field: 'age' | 'gender' | 'occupation') =>
    (profile.private_fields ?? []).includes(field);

  if (c.ageMin != null || c.ageMax != null) {
    if (isPrivate('age') || profile.age == null) return false;
    if (c.ageMin != null && profile.age < c.ageMin) return false;
    if (c.ageMax != null && profile.age > c.ageMax) return false;
  }
  if (c.genders?.length) {
    if (isPrivate('gender') || !profile.gender) return false;
    if (!c.genders.includes(profile.gender)) return false;
  }
  if (c.occupations?.length) {
    if (isPrivate('occupation') || !profile.occupation) return false;
    if (!c.occupations.includes(profile.occupation)) return false;
  }
  return true;
}
