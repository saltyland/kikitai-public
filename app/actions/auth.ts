'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';

export interface ActionState {
  error: string | null;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  try {
    await auth.login(email, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ログインに失敗しました' };
  }
  redirect('/');
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const nickname = String(formData.get('nickname') ?? '');
  const affiliation = String(formData.get('affiliation') ?? '');
  const field = String(formData.get('field') ?? '');

  if (!email || !password || !nickname) {
    return { error: 'メールアドレス・パスワード・ニックネームは必須です' };
  }
  if (!/^[a-z0-9]{6,}$/.test(password)) {
    return { error: 'パスワードは小文字と数字のみ・6文字以上で入力してください' };
  }

  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  try {
    await auth.register({
      email,
      password,
      nickname,
      affiliation: affiliation || undefined,
      field: field || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : '登録に失敗しました' };
  }
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await new AuthService(supabase).logout();
  redirect('/login');
}
