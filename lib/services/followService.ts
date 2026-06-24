import type { SupabaseClient } from '@supabase/supabase-js';
import { FollowRepository } from '@/lib/repositories/followRepository';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import type { PublicProfile } from '@/lib/types/database';

/** ユーザー間フォローのビジネスロジック */
export class FollowService {
  private readonly repo: FollowRepository;
  private readonly profileRepo: ProfileRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new FollowRepository(supabase);
    this.profileRepo = new ProfileRepository(supabase);
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

  /** フォロー中ユーザーの公開プロフィール一覧を取得する */
  async getFollowedUserProfiles(userId: string): Promise<PublicProfile[]> {
    const ids = await this.repo.listFollowedUserIds(userId);
    const profiles = await this.profileRepo.findByIds(ids);
    return ids.map((id) => profiles.get(id)).filter((p): p is PublicProfile => p !== undefined);
  }
}
