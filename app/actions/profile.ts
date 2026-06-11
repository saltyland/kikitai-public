'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import type { PrivateField } from '@/lib/types/database';

export interface ProfileActionState {
  error: string | null;
  success?: boolean;
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v || null;
  };
  const nickname = String(formData.get('nickname') ?? '');
  const ageRaw = str('age');
  const age = ageRaw !== null && /^\d{1,3}$/.test(ageRaw) ? Number(ageRaw) : null;
  // 非公開チェックされた属性名（PRIVATE_FIELDS のみ許可されサービス層で正規化）
  const privateFields = formData
    .getAll('private_fields')
    .map((v) => String(v)) as PrivateField[];

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  const service = new ProfileService(supabase);

  try {
    // アバター画像が選択されていればアップロードし、その公開URLだけ更新に含める
    const avatar = formData.get('avatar');
    let avatarUrl: string | undefined;
    if (avatar instanceof File && avatar.size > 0) {
      avatarUrl = await service.uploadAvatar(user.id, avatar);
    }

    await service.updateProfile(user.id, {
      nickname,
      affiliation: str('affiliation'),
      field: str('field'),
      age,
      gender: str('gender'),
      occupation: str('occupation'),
      grade: str('grade'),
      major: str('major'),
      private_fields: privateFields,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新に失敗しました' };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout'); // ヘッダー等のアバター表示を更新
  return { error: null, success: true };
}

export async function changePlanAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const plan = String(formData.get('plan') ?? '');
  if (plan !== 'free' && plan !== 'pro') return { error: 'プランの指定が不正です' };

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  try {
    await new ProfileService(supabase).changePlan(user.id, plan);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'プラン変更に失敗しました' };
  }

  revalidatePath('/profile');
  return { error: null, success: true };
}

// useActionState から呼ばれるが、前回stateもフォーム値も使わないため引数は受け取らない
export async function deleteAccountAction(): Promise<ProfileActionState> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) redirect('/login');

  try {
    await new ProfileService(supabase).deleteAccount(user!.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : '退会処理に失敗しました' };
  }
  redirect('/login');
}
