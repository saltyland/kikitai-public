'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';

/** ベルのドロップダウンから「すべて既読にする」 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;
  await new NotificationService(supabase).markAllRead(user.id);
  revalidatePath('/', 'layout');
}

/** /notifications ページから通知を1件既読にする */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await new AuthService(supabase).getCurrentUser();
  if (!user) return;
  const notificationId = formData.get('notificationId');
  if (typeof notificationId !== 'string' || !notificationId) return;
  await new NotificationService(supabase).markAsRead(user.id, notificationId);
  revalidatePath('/notifications');
  revalidatePath('/', 'layout');
}
