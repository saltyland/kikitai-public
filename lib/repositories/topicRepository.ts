import type { SupabaseClient } from '@supabase/supabase-js';
import type { Topic } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { throwDbError } from './dbError';

/** トピックマスタのDBアクセスを抽象化するインターフェース */
export interface ITopicRepository {
  /** 全トピックをカテゴリ・名前順で取得する */
  listAll(): Promise<Topic[]>;
  /** idの配列からトピックを取得する */
  findByIds(ids: string[]): Promise<Topic[]>;
  /** 指定カテゴリのトピックを取得する */
  listByCategory(category: string): Promise<Topic[]>;
  /**
   * 指定トピックと同カテゴリの近接トピックを取得する（レコメンド用）。
   * 自分自身は結果に含めない。
   */
  findRelated(topicId: string, limit?: number): Promise<Topic[]>;
}

export class TopicRepository extends BaseRepository<Topic> implements ITopicRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'topics');
  }

  async listAll(): Promise<Topic[]> {
    const { data, error } = await this.supabase
      .from('topics')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throwDbError(error, 'topics');
    return (data ?? []) as Topic[];
  }

  async findByIds(ids: string[]): Promise<Topic[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase.from('topics').select('*').in('id', ids);
    if (error) throwDbError(error, 'topics');
    return (data ?? []) as Topic[];
  }

  async listByCategory(category: string): Promise<Topic[]> {
    const { data, error } = await this.supabase
      .from('topics')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });
    if (error) throwDbError(error, 'topics');
    return (data ?? []) as Topic[];
  }

  async findRelated(topicId: string, limit = 5): Promise<Topic[]> {
    const topic = await this.findById(topicId);
    if (!topic) return [];

    const { data, error } = await this.supabase
      .from('topics')
      .select('*')
      .eq('category', topic.category)
      .neq('id', topicId)
      .order('name', { ascending: true })
      .limit(limit);
    if (error) throwDbError(error, 'topics');
    return (data ?? []) as Topic[];
  }
}
