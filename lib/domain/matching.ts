import type { Profile, TargetConditions } from '@/lib/types/database';

/**
 * 属性マッチング配信（要件：学術的に意味のある回答者集め）。
 *
 * アンケートの target_conditions と回答者プロフィールを突き合わせ、
 * 条件を満たす場合のみ一覧に配信する。
 *
 * 属性は全員必須で登録されるため、回答者の素の属性で判定する。
 * プロフィールの公開/非公開設定（private_fields）はプロフィール表示だけの
 * 設定で、マッチングには影響しない。
 */
type MatchableProfile = Pick<Profile, 'age' | 'gender' | 'occupation'>;

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

  if (c.ageMin != null || c.ageMax != null) {
    if (profile.age == null) return false;
    if (c.ageMin != null && profile.age < c.ageMin) return false;
    if (c.ageMax != null && profile.age > c.ageMax) return false;
  }
  if (c.genders?.length) {
    if (!profile.gender) return false;
    if (!c.genders.includes(profile.gender)) return false;
  }
  if (c.occupations?.length) {
    if (!profile.occupation) return false;
    if (!c.occupations.includes(profile.occupation)) return false;
  }
  return true;
}
