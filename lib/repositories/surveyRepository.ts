import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Survey,
  SurveyStatus,
  SurveyWithQuestions,
  QuestionWithOptions,
  PreviewQuestionLite,
  QuestionType,
} from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { throwDbError } from './dbError';

/** アンケート本体・設問・選択肢のDBアクセスを抽象化するインターフェース */
export interface ISurveyRepository {
  findById(id: string): Promise<Survey | null>;
  findWithQuestions(id: string): Promise<SurveyWithQuestions | null>;
  findByOwner(userId: string): Promise<Survey[]>;
  findOpenSurveys(): Promise<Survey[]>;
  countResponses(surveyId: string): Promise<number>;
  countResponsesBySurveyIds(surveyIds: string[]): Promise<Map<string, number>>;
  /** 複数アンケートの設問プレビュー（先頭数問）を1クエリでまとめて取得する */
  findPreviewQuestionsBySurveyIds(
    surveyIds: string[],
    perSurvey?: number
  ): Promise<Map<string, PreviewQuestionLite[]>>;
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
    if (error) throwDbError(error, 'surveys');
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
    if (error) throwDbError(error, 'surveys');
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
    if (error) throwDbError(error, 'surveys');
    return (data ?? []) as Survey[];
  }

  /** 複数アンケートの回答数を1クエリでまとめて取得する（一覧表示のN+1対策） */
  async countResponsesBySurveyIds(surveyIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (surveyIds.length === 0) return counts;
    const { data, error } = await this.supabase
      .from('responses')
      .select('survey_id')
      .in('survey_id', surveyIds);
    if (error) throwDbError(error, 'surveys');
    for (const row of (data ?? []) as { survey_id: string }[]) {
      counts.set(row.survey_id, (counts.get(row.survey_id) ?? 0) + 1);
    }
    return counts;
  }

  async findPreviewQuestionsBySurveyIds(
    surveyIds: string[],
    perSurvey = 4
  ): Promise<Map<string, PreviewQuestionLite[]>> {
    const map = new Map<string, PreviewQuestionLite[]>();
    if (surveyIds.length === 0) return map;
    const { data, error } = await this.supabase
      .from('questions')
      .select('survey_id, type, text, order_index, options(text, order_index)')
      .in('survey_id', surveyIds)
      .order('order_index', { ascending: true });
    if (error) throwDbError(error, 'questions');

    type Row = {
      survey_id: string;
      type: QuestionType;
      text: string;
      options: { text: string; order_index: number }[] | null;
    };
    for (const row of (data ?? []) as Row[]) {
      const list = map.get(row.survey_id) ?? [];
      if (list.length >= perSurvey) continue;
      list.push({
        type: row.type,
        text: row.text,
        options: (row.options ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((o) => o.text),
      });
      map.set(row.survey_id, list);
    }
    return map;
  }

  async countResponses(surveyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId);
    if (error) throwDbError(error, 'surveys');
    return count ?? 0;
  }

  async insertSurvey(data: Omit<Survey, 'id' | 'created_at'>): Promise<Survey> {
    const { data: inserted, error } = await this.supabase
      .from('surveys')
      .insert(data)
      .select('*')
      .single();
    if (error) throwDbError(error, 'surveys');
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
    if (error) throwDbError(error, 'surveys');
    return updated as Survey;
  }

  async updateStatus(id: string, status: SurveyStatus): Promise<void> {
    const { error } = await this.supabase
      .from('surveys')
      .update({ status })
      .eq('id', id);
    if (error) throwDbError(error, 'surveys');
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
    if (delError) throwDbError(delError, 'questions.delete');

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
      if (qError) throwDbError(qError, 'questions.insert');

      if (q.options.length > 0) {
        const { error: oError } = await this.supabase.from('options').insert(
          q.options.map((o) => ({
            question_id: (insertedQ as { id: string }).id,
            text: o.text,
            order_index: o.order_index,
          }))
        );
        if (oError) throwDbError(oError, 'options.insert');
      }
    }
  }
}
