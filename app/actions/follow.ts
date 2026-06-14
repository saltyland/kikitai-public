'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { FollowService } from '@/lib/services/followService';

/** 指定ユーザーをフォローする */
export async function followUserAction(followeeId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;

  await new FollowService(supabase).followUser(user.id, followeeId);
  revalidatePath(`/users/${followeeId}`);
  revalidatePath('/profile');
}

/** 指定ユーザーのフォローを解除する */
export async function unfollowUserAction(followeeId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;

  await new FollowService(supabase).unfollowUser(user.id, followeeId);
  revalidatePath(`/users/${followeeId}`);
  revalidatePath('/profile');
}
