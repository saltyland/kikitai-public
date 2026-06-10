import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Survey,
  SurveyStatus,
  SurveyWithQuestions,
  QuestionWithOptions,
} from '@/lib/types/database';
import { BaseRepository } from './baseRepository';

/** アンケート本体・設問・選択肢のDBアクセスを抽象化するインターフェース */
export interface ISurveyRepository {
  findById(id: string): Promise<Survey | null>;
  findWithQuestions(id: string): Promise<SurveyWithQuestions | null>;
  findByOwner(userId: string): Promise<Survey[]>;
  findOpenSurveys(): Promise<Survey[]>;
  countResponses(surveyId: string): Promise<number>;
  insertSurvey(data: Omit<Survey, 'id' | 'created_at'>): Promise<Survey>;
  updateSurvey(
    id: string,
    data: Partial<Omit<Survey, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Survey>;
  updateStatus(id: string, status: SurveyStatus): Promise<void>;
  delete(id: string): Promise<void>;
  /** 設問と選択肢を一括で置き換える（既存削除 → 新規挿入） */
  replaceQuestions(surveyId: string, questions: QuestionRow[]): Promise<void>;
}

/** replaceQuestions が受け取る設問1件分の保存データ */
export interface QuestionRow {
  type: string;
  text: string;
  description: string | null;
  required: boolean;
  config: unknown | null;
  section_index: number;
  order_index: number;
  condition: unknown | null;
  options: { text: string; order_index: number }[];
}

export class SurveyRepository extends BaseRepository<Survey> implements ISurveyRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'surveys');
  }

  // findById は BaseRepository から継承

  async findWithQuestions(id: string): Promise<SurveyWithQuestions | null> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*, questions(*, options(*))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const survey = data as unknown as SurveyWithQuestions;
    // 設問・選択肢をorder_indexで並べ替え
    survey.questions = (survey.questions ?? [])
      .map((q: QuestionWithOptions) => ({
        ...q,
        options: (q.options ?? []).sort((a, b) => a.order_index - b.order_index),
      }))
      .sort((a, b) => a.order_index - b.order_index);
    return survey;
  }

  async findByOwner(userId: string): Promise<Survey[]> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Survey[];
  }

  async findOpenSurveys(): Promise<Survey[]> {
    // 期限なし(null)、または期限が今日以降のもののみ。期限切れは除外する。
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .eq('status', 'open')
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Survey[];
  }

  async countResponses(surveyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async insertSurvey(data: Omit<Survey, 'id' | 'created_at'>): Promise<Survey> {
    const { data: inserted, error } = await this.supabase
      .from('surveys')
      .insert(data)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return inserted as Survey;
  }

  async updateSurvey(
    id: string,
    data: Partial<Omit<Survey, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Survey> {
    const { data: updated, error } = await this.supabase
      .from('surveys')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return updated as Survey;
  }

  async updateStatus(id: string, status: SurveyStatus): Promise<void> {
    const { error } = await this.supabase
      .from('surveys')
      .update({ status })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  async replaceQuestions(surveyId: string, questions: QuestionRow[]): Promise<void> {
    // 既存設問を削除（選択肢はON DELETE CASCADEで消える）
    const { error: delError } = await this.supabase
      .from('questions')
      .delete()
      .eq('survey_id', surveyId);
    if (delError) throw new Error(delError.message);

    for (const q of questions) {
      const { data: insertedQ, error: qError } = await this.supabase
        .from('questions')
        .insert({
          survey_id: surveyId,
          type: q.type,
          text: q.text,
          description: q.description,
          required: q.required,
          config: q.config,
          section_index: q.section_index,
          order_index: q.order_index,
          condition: q.condition,
        })
        .select('id')
        .single();
      if (qError) throw new Error(qError.message);

      if (q.options.length > 0) {
        const { error: oError } = await this.supabase.from('options').insert(
          q.options.map((o) => ({
            question_id: (insertedQ as { id: string }).id,
            text: o.text,
            order_index: o.order_index,
          }))
        );
        if (oError) throw new Error(oError.message);
      }
    }
  }
}
