'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';

export interface ProfileActionState {
  error: string | null;
  success?: boolean;
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const nickname = String(formData.get('nickname') ?? '');
  const affiliation = String(formData.get('affiliation') ?? '');
  const field = String(formData.get('field') ?? '');

  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  try {
    await new ProfileService(supabase).updateProfile(user.id, {
      nickname,
      affiliation: affiliation || null,
      field: field || null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新に失敗しました' };
  }

  revalidatePath('/profile');
  return { error: null, success: true };
}

export async function deleteAccountAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) redirect('/login');

  await new ProfileService(supabase).deleteAccount(user!.id);
  redirect('/login');
}
