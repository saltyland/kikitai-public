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

  const next = String(formData.get('next') ?? '');

  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  try {
    await auth.login(email, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ログインに失敗しました' };
  }
  // next は自サイトの相対パスのみ許可する（オープンリダイレクト防止）
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードは必須です' };
  }
  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で入力してください' };
  }
  if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'パスワードには英小文字と数字をそれぞれ1文字以上含めてください' };
  }

  // ニックネームはメールの@前部分から自動生成（オンボーディングで変更可）
  const autoNickname = email.split('@')[0] ?? 'ユーザー';

  const supabase = await createSupabaseServerClient();
  const auth = new AuthService(supabase);
  let hasSession = false;
  try {
    ({ hasSession } = await auth.register({
      email,
      password,
      nickname: autoNickname,
    }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : '登録に失敗しました' };
  }

  if (!hasSession) {
    return {
      error:
        'アカウントは作成されましたが、メール確認が必要な設定になっています。受信した確認メールのリンクを開いて登録を完了してください。（即時利用するには管理者がメール確認をOFFにする必要があります）',
    };
  }

  // nextが指定されていればそちらへ、なければオンボーディングへ
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await new AuthService(supabase).logout();
  redirect('/login');
}
