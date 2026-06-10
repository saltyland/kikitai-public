import type { SupabaseClient } from '@supabase/supabase-js';
import type { Answer, AnswerInput, ResponseSession } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';

/** 回答セッション・個別回答のDBアクセスを抽象化するインターフェース */
export interface IResponseRepository {
  hasResponded(surveyId: string, userId: string): Promise<boolean>;
  /** 回答セッションと個別回答をまとめて保存する */
  saveResponse(
    surveyId: string,
    userId: string,
    answers: AnswerInput[]
  ): Promise<void>;
  /** あるアンケートの全回答（個別回答）を取得する。結果集計用。 */
  findAnswersBySurvey(surveyId: string): Promise<Answer[]>;
}

export class ResponseRepository
  extends BaseRepository<ResponseSession>
  implements IResponseRepository
{
  constructor(supabase: SupabaseClient) {
    super(supabase, 'responses');
  }

  async hasResponded(surveyId: string, userId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async saveResponse(
    surveyId: string,
    userId: string,
    answers: AnswerInput[]
  ): Promise<void> {
    // 回答セッションを作成
    const { data: session, error: sError } = await this.supabase
      .from('responses')
      .insert({ survey_id: surveyId, user_id: userId })
      .select('id')
      .single();
    if (sError) throw new Error(sError.message);

    const responseId = (session as { id: string }).id;

    // 個別回答を組み立てる（multipleは選択肢ごとに1行）
    const rows: Omit<Answer, 'id'>[] = [];
    for (const a of answers) {
      if (a.text_answer !== undefined && a.text_answer !== null) {
        rows.push({
          response_id: responseId,
          question_id: a.question_id,
          option_id: null,
          text_answer: a.text_answer,
        });
      }
      for (const optionId of a.option_ids ?? []) {
        rows.push({
          response_id: responseId,
          question_id: a.question_id,
          option_id: optionId,
          text_answer: null,
        });
      }
    }

    if (rows.length > 0) {
      const { error: aError } = await this.supabase.from('answers').insert(rows);
      if (aError) throw new Error(aError.message);
    }
  }

  async findAnswersBySurvey(surveyId: string): Promise<Answer[]> {
    // responses経由でsurveyに紐づくanswersを取得
    const { data: sessions, error: sError } = await this.supabase
      .from('responses')
      .select('id')
      .eq('survey_id', surveyId);
    if (sError) throw new Error(sError.message);

    const ids = (sessions ?? []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from('answers')
      .select('*')
      .in('response_id', ids);
    if (error) throw new Error(error.message);
    return (data ?? []) as Answer[];
  }
}
