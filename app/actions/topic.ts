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
