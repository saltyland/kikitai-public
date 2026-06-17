import type { SupabaseClient } from '@supabase/supabase-js';
import { TopicRepository } from '@/lib/repositories/topicRepository';
import { FollowRepository } from '@/lib/repositories/followRepository';
import type { Topic } from '@/lib/types/database';

/** トピック一覧・フォロー状況・レコメンドのビジネスロジック */
export class TopicService {
  private readonly topicRepo: TopicRepository;
  private readonly followRepo: FollowRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.topicRepo = new TopicRepository(supabase);
    this.followRepo = new FollowRepository(supabase);
  }

  /** 全トピックをカテゴリ・名前順で取得する */
  async listAll(): Promise<Topic[]> {
    return this.topicRepo.listAll();
  }

  /** 指定カテゴリのトピックを取得する */
  async listByCategory(category: string): Promise<Topic[]> {
    return this.topicRepo.listByCategory(category);
  }

  /** トピックIDを取得する */
  async getById(id: string): Promise<Topic | null> {
    return this.topicRepo.findById(id);
  }

  /** ユーザーがフォロー中のトピック一覧を取得する */
  async getFollowedTopics(userId: string): Promise<Topic[]> {
    const ids = await this.followRepo.listFollowedTopicIds(userId);
    return this.topicRepo.findByIds(ids);
  }

  /** 指定トピックと同カテゴリの近接トピックを取得する（レコメンド用） */
  async recommendRelated(topicId: string, limit?: number): Promise<Topic[]> {
    return this.topicRepo.findRelated(topicId, limit);
  }

  /** 自分が指定トピックをフォロー中か */
  async isFollowingTopic(userId: string, topicId: string): Promise<boolean> {
    return this.followRepo.isFollowingTopic(userId, topicId);
  }

  /** トピックをフォローする */
  async followTopic(userId: string, topicId: string): Promise<void> {
    await this.followRepo.followTopic(userId, topicId);
  }

  /** トピックのフォローを解除する */
  async unfollowTopic(userId: string, topicId: string): Promise<void> {
    await this.followRepo.unfollowTopic(userId, topicId);
  }

  /** 複数トピックを一括フォローする（オンボーディングのトピック選択など） */
  async followTopics(userId: string, topicIds: string[]): Promise<void> {
    await this.followRepo.followTopics(userId, topicIds);
  }
}
