'use server';

import { redirect } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const DEMO_EMAIL_DOMAIN = 'kikitai.demo';
const DEMO_PASSWORD = 'demo-kikitai-2026';
const MAX_DEMO_SLOTS = 10;
const DEMO_EXPIRY_MS = 30 * 60 * 1000;

export interface DemoLoginState {
  error: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function demoLoginAction(_prev: DemoLoginState, _formData: FormData): Promise<DemoLoginState> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: 'デモ機能は現在利用できません（管理キー未設定）' };
  }

  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return { error: 'デモユーザーの取得に失敗しました' };

  const demoUsers = usersData.users.filter((u) =>
    u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`)
  );

  const now = Date.now();

  // 30分以上経過したデモアカウントを削除
  for (const u of demoUsers) {
    const createdAt = new Date(u.created_at).getTime();
    if (now - createdAt > DEMO_EXPIRY_MS) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }

  // 有効なデモユーザーを再取得
  const { data: freshData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const activeDemoUsers = (freshData?.users ?? []).filter((u) =>
    u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`)
  );

  // 空いているスロット番号を探す
  const usedSlots = new Set(
    activeDemoUsers
      .map((u) => {
        const m = u.email?.match(/^demo(\d+)@/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
  );

  let slot: number | null = null;
  for (let i = 1; i <= MAX_DEMO_SLOTS; i++) {
    if (!usedSlots.has(i)) {
      slot = i;
      break;
    }
  }

  // 全スロット使用中（30分以内のアカウントが10件）→ 最古を削除して再利用
  if (slot === null) {
    const oldest = [...activeDemoUsers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    if (oldest) {
      await admin.auth.admin.deleteUser(oldest.id);
      const m = oldest.email?.match(/^demo(\d+)@/);
      slot = m ? parseInt(m[1], 10) : 1;
    } else {
      slot = 1;
    }
  }

  const email = `demo${slot}@${DEMO_EMAIL_DOMAIN}`;
  const nickname = `デモ${slot}`;

  // デモアカウント作成
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nickname, full_name: nickname },
  });

  if (createError) {
    return { error: `デモアカウントの作成に失敗しました: ${createError.message}` };
  }

  // デモユーザーとしてログイン
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });

  if (signInError) {
    return { error: 'デモログインに失敗しました。もう一度お試しください。' };
  }

  redirect('/onboarding');
}
