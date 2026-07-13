'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyTurnstileToken } from '@/lib/security/turnstile';

const DEMO_EMAIL_DOMAIN = 'kikitai.demo';
const DEMO_PASSWORD = 'demo-kikitai-2026';

export interface DemoLoginState {
  error: string | null;
}

export async function demoLoginAction(_prev: DemoLoginState, formData: FormData): Promise<DemoLoginState> {
  // ボット対策：デモは匿名でアカウントを作れる唯一の経路のため、
  // 自動化された大量アカウント作成（新規登録ボーナス稼ぎ）を Turnstile で防ぐ。
  // キー未設定の環境では verifyTurnstileToken が検証をスキップし従来どおり動く。
  const token = formData.get('cf-turnstile-response');
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const captcha = await verifyTurnstileToken(typeof token === 'string' ? token : null, ip);
  if (!captcha.ok) {
    return { error: '人間であることの確認に失敗しました。ページを再読み込みしてお試しください。' };
  }

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
