import type { SupabaseClient } from '@supabase/supabase-js';
import { throwDbError } from './dbError';

/** ユーザー間フォローのDBアクセスを抽象化するインターフェース */
export interface IFollowRepository {
  /** 自分がそのユーザーをフォロー中か */
  isFollowingUser(followerId: string, followeeId: string): Promise<boolean>;
  /** ユーザーをフォローする */
  followUser(followerId: string, followeeId: string): Promise<void>;
  /** ユーザーのフォローを解除する */
  unfollowUser(followerId: string, followeeId: string): Promise<void>;
  /** 自分がフォロー中のユーザーID一覧を取得する */
  listFollowedUserIds(followerId: string): Promise<string[]>;
}

export class FollowRepository implements IFollowRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async isFollowingUser(followerId: string, followeeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .maybeSingle();
    if (error) throwDbError(error, 'user_follows');
    return data !== null;
  }

  async followUser(followerId: string, followeeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_follows')
      .insert({ follower_id: followerId, followee_id: followeeId });
    if (error) throwDbError(error, 'user_follows');
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId);
    if (error) throwDbError(error, 'user_follows');
  }

  async listFollowedUserIds(followerId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', followerId);
    if (error) throwDbError(error, 'user_follows');
    return (data ?? []).map((row) => row.followee_id as string);
  }
}
