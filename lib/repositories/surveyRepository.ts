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
import { throwDbError, throwRpcError } from './dbError';

/** アンケート本体・設問・選択肢のDBアクセスを抽象化するインターフェース */
export interface ISurveyRepository {
  findById(id: string): Promise<Survey | null>;
  findWithQuestions(id: string): Promise<SurveyWithQuestions | null>;
  findByOwner(userId: string): Promise<Survey[]>;
  findOpenSurveys(): Promise<Survey[]>;
  /** 指定ユーザーたちが作成した公開中・公開設定のアンケートを取得する */
  findByUserIds(userIds: string[]): Promise<Survey[]>;
  countResponses(surveyId: string): Promise<number>;
  countResponsesBySurveyIds(surveyIds: string[]): Promise<Map<string, number>>;
  /** 複数アンケートの「作成者が消費したポイント」合計を1クエリでまとめて取得する */
  sumConsumedPointsBySurveyIds(surveyIds: string[]): Promise<Map<string, number>>;
  /** 複数アンケートの設問プレビュー（先頭数問）を1クエリでまとめて取得する */
  findPreviewQuestionsBySurveyIds(
    surveyIds: string[],
    perSurvey?: number
  ): Promise<Map<string, PreviewQuestionLite[]>>;
  /** share_token はDBの default（乱数）で自動生成するため受け取らない */
  insertSurvey(data: Omit<Survey, 'id' | 'created_at' | 'share_token'>): Promise<Survey>;
  /** 共有トークンから設問つきアンケートを取得する（RPC・未ログイン可） */
  findByShareToken(token: string): Promise<SurveyWithQuestions | null>;
  updateSurvey(
    id: string,
    data: Partial<Omit<Survey, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Survey>;
  updateStatus(id: string, status: SurveyStatus): Promise<void>;
  /**
   * 公開（draft→open）。RPC（publish_survey）がopen化を行う。ポイントは公開時には
   * 消費せず、回答が届くたびに品質比例で消費される（submit_survey_response）。
   * 公開時は最低残高（1回答分＝設問単価合計）のみチェックし、不足は
   * BusinessRuleError（INSUFFICIENT_POINTS）。
   */
  publish(id: string): Promise<number>;
  /** 複数アンケートの設問タイプ一覧を1クエリでまとめて取得する（報酬目安の算出用） */
  findQuestionTypesBySurveyIds(surveyIds: string[]): Promise<Map<string, QuestionType[]>>;
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

  async findByUserIds(userIds: string[]): Promise<Survey[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .in('user_id', userIds)
      .eq('status', 'open')
      .eq('visibility', 'public')
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

  async sumConsumedPointsBySurveyIds(surveyIds: string[]): Promise<Map<string, number>> {
    const sums = new Map<string, number>();
    if (surveyIds.length === 0) return sums;
    const { data, error } = await this.supabase
      .from('responses')
      .select('survey_id, consumed_points')
      .in('survey_id', surveyIds);
    if (error) throwDbError(error, 'surveys');
    for (const row of (data ?? []) as { survey_id: string; consumed_points: number | null }[]) {
      sums.set(row.survey_id, (sums.get(row.survey_id) ?? 0) + (row.consumed_points ?? 0));
    }
    return sums;
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

  async findQuestionTypesBySurveyIds(
    surveyIds: string[]
  ): Promise<Map<string, QuestionType[]>> {
    const map = new Map<string, QuestionType[]>();
    if (surveyIds.length === 0) return map;
    const { data, error } = await this.supabase
      .from('questions')
      .select('survey_id, type')
      .in('survey_id', surveyIds);
    if (error) throwDbError(error, 'questions');
    for (const row of (data ?? []) as { survey_id: string; type: QuestionType }[]) {
      const list = map.get(row.survey_id) ?? [];
      list.push(row.type);
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

  async findByShareToken(token: string): Promise<SurveyWithQuestions | null> {
    // 共有リンクは未ログインでも開けるため、RLSを迂回する security definer RPC で取得する
    const { data, error } = await this.supabase.rpc('get_shared_survey', { p_token: token });
    if (error) throwRpcError(error, 'get_shared_survey');
    if (!data) return null;

    const survey = data as unknown as SurveyWithQuestions;
    // RPC側でも並べているが、表示順の保証はアプリ側でも行う
    survey.questions = (survey.questions ?? [])
      .map((q: QuestionWithOptions) => ({
        ...q,
        options: (q.options ?? []).sort((a, b) => a.order_index - b.order_index),
      }))
      .sort((a, b) => a.order_index - b.order_index);
    return survey;
  }

  async insertSurvey(data: Omit<Survey, 'id' | 'created_at' | 'share_token'>): Promise<Survey> {
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

  async publish(id: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('publish_survey', {
      p_survey_id: id,
    });
    if (error) throwRpcError(error, 'publish_survey');
    return (data as number) ?? 0;
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
