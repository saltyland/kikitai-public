'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { TopicService } from '@/lib/services/topicService';

/** 指定トピックをフォローする */
export async function followTopicAction(topicId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;

  await new TopicService(supabase).followTopic(user.id, topicId);
  revalidatePath(`/topics/${topicId}`);
}

/** 指定トピックのフォローを解除する */
export async function unfollowTopicAction(topicId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;

  await new TopicService(supabase).unfollowTopic(user.id, topicId);
  revalidatePath(`/topics/${topicId}`);
}

export interface TopicSelectionActionState {
  error: string | null;
}

/**
 * オンボーディングのトピック選択ステップ／既存ユーザー向け再訪促進バナーから呼ばれる。
 * 選択したトピックを一括フォローし topics_selected_at を記録する。
 * スキップ時は topic_ids なしで呼び出され、記録のみ行う。
 */
export async function completeTopicSelectionAction(
  _prev: TopicSelectionActionState,
  formData: FormData
): Promise<TopicSelectionActionState> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return { error: 'ログインが必要です' };

  const topicIds = formData.getAll('topic_ids').map(String);

  try {
    await new TopicService(supabase).completeTopicSelection(user.id, topicIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : '保存に失敗しました' };
  }

  revalidatePath('/', 'layout');
  return { error: null };
}
