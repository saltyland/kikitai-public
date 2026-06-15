'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const DEMO_EMAIL_DOMAIN = 'kikitai.demo';
const DEMO_PASSWORD = 'demo-kikitai-2026';

export interface DemoLoginState {
  error: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function demoLoginAction(_prev: DemoLoginState, _formData: FormData): Promise<DemoLoginState> {
  // タイムスタンプベースのユニークなデモメール（管理者キー不要）
  const uid = Date.now().toString(36);
  const email = `demo-${uid}@${DEMO_EMAIL_DOMAIN}`;
  const nickname = 'デモユーザー';

  const supabase = await createSupabaseServerClient();

  // signUp はメール確認OFF環境では即セッションが発行される
  const { error } = await supabase.auth.signUp({
    email,
    password: DEMO_PASSWORD,
    options: {
      data: { nickname, full_name: nickname },
    },
  });

  if (error) {
    return { error: 'デモの開始に失敗しました。もう一度お試しください。' };
  }

  redirect('/onboarding');
}
