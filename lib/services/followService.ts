import type { SupabaseClient } from '@supabase/supabase-js';
import { FollowRepository } from '@/lib/repositories/followRepository';

/** ユーザー間フォロー・トピックフォローのビジネスロジック */
export class FollowService {
  private readonly repo: FollowRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new FollowRepository(supabase);
  }

  /** 自分が指定ユーザーをフォロー中か */
  async isFollowingUser(followerId: string, followeeId: string): Promise<boolean> {
    return this.repo.isFollowingUser(followerId, followeeId);
  }

  /** ユーザーをフォローする（自分自身のフォローはDBのcheck制約で拒否される） */
  async followUser(followerId: string, followeeId: string): Promise<void> {
    await this.repo.followUser(followerId, followeeId);
  }

  /** ユーザーのフォローを解除する */
  async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    await this.repo.unfollowUser(followerId, followeeId);
  }
}
