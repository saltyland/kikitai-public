import type { SupabaseClient } from '@supabase/supabase-js';
import { throwDbError } from './dbError';

/** ユーザー間フォロー・トピックフォローのDBアクセスを抽象化するインターフェース */
export interface IFollowRepository {
  /** 自分がそのユーザーをフォロー中か */
  isFollowingUser(followerId: string, followeeId: string): Promise<boolean>;
  /** ユーザーをフォローする */
  followUser(followerId: string, followeeId: string): Promise<void>;
  /** ユーザーのフォローを解除する */
  unfollowUser(followerId: string, followeeId: string): Promise<void>;
  /** 自分がフォロー中のユーザーID一覧を取得する */
  listFollowedUserIds(followerId: string): Promise<string[]>;

  /** 自分がそのトピックをフォロー中か */
  isFollowingTopic(userId: string, topicId: string): Promise<boolean>;
  /** トピックをフォローする */
  followTopic(userId: string, topicId: string): Promise<void>;
  /** トピックのフォローを解除する */
  unfollowTopic(userId: string, topicId: string): Promise<void>;
  /** 自分がフォロー中のトピックID一覧を取得する */
  listFollowedTopicIds(userId: string): Promise<string[]>;
  /** トピックIDの配列をまとめてフォローする（オンボーディング一括登録用） */
  followTopics(userId: string, topicIds: string[]): Promise<void>;
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

  async isFollowingTopic(userId: string, topicId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_topic_follows')
      .select('user_id')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .maybeSingle();
    if (error) throwDbError(error, 'user_topic_follows');
    return data !== null;
  }

  async followTopic(userId: string, topicId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_topic_follows')
      .insert({ user_id: userId, topic_id: topicId });
    if (error) throwDbError(error, 'user_topic_follows');
  }

  async unfollowTopic(userId: string, topicId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_topic_follows')
      .delete()
      .eq('user_id', userId)
      .eq('topic_id', topicId);
    if (error) throwDbError(error, 'user_topic_follows');
  }

  async listFollowedTopicIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_topic_follows')
      .select('topic_id')
      .eq('user_id', userId);
    if (error) throwDbError(error, 'user_topic_follows');
    return (data ?? []).map((row) => row.topic_id as string);
  }

  async followTopics(userId: string, topicIds: string[]): Promise<void> {
    if (topicIds.length === 0) return;
    const { error } = await this.supabase
      .from('user_topic_follows')
      .insert(topicIds.map((topicId) => ({ user_id: userId, topic_id: topicId })));
    if (error) throwDbError(error, 'user_topic_follows');
  }
}
