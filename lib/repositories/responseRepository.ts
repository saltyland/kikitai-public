import type { SupabaseClient } from '@supabase/supabase-js';
import type { Answer, AnswerInput, ResponseSession } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { isUniqueViolation, throwDbError } from './dbError';

/** 回答セッション・個別回答のDBアクセスを抽象化するインターフェース */
export interface IResponseRepository {
  hasResponded(surveyId: string, userId: string): Promise<boolean>;
  /** 指定ユーザーが回答済みのアンケートidを1クエリでまとめて取得する（一覧表示のN+1対策） */
  findRespondedSurveyIds(userId: string, surveyIds: string[]): Promise<Set<string>>;
  /** 回答セッションと個別回答をまとめて保存する */
  saveResponse(
    surveyId: string,
    userId: string,
    answers: AnswerInput[]
  ): Promise<void>;
  /** あるアンケートの全回答（個別回答）を取得する。結果集計用。 */
  findAnswersBySurvey(surveyId: string): Promise<Answer[]>;
  /** あるアンケートの回答セッション一覧を取得する。CSV出力用。 */
  findSessionsBySurvey(surveyId: string): Promise<ResponseSession[]>;
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
    if (error) throwDbError(error, 'responses');
    return (count ?? 0) > 0;
  }

  async findRespondedSurveyIds(userId: string, surveyIds: string[]): Promise<Set<string>> {
    if (surveyIds.length === 0) return new Set();
    const { data, error } = await this.supabase
      .from('responses')
      .select('survey_id')
      .eq('user_id', userId)
      .in('survey_id', surveyIds);
    if (error) throwDbError(error, 'responses');
    return new Set(((data ?? []) as { survey_id: string }[]).map((r) => r.survey_id));
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
    if (sError) {
      // 事前の hasResponded チェックとすれ違いで二重送信された場合は
      // unique(survey_id, user_id) 制約に当たるため、分かりやすいメッセージに変換する
      if (isUniqueViolation(sError)) {
        throw new Error('すでに回答済みです。ページを再読み込みしてください。');
      }
      throwDbError(sError, 'responses.insert');
    }

    const responseId = (session as { id: string }).id;

    // 個別回答を組み立てる
    //  - multiple: 選択肢ごとに1行
    //  - grid: 行×選択列ごとに1行（row_labelに行ラベル、text_answerに列ラベル）
    const rows: Omit<Answer, 'id'>[] = [];
    for (const a of answers) {
      if (a.text_answer !== undefined && a.text_answer !== null && a.text_answer !== '') {
        rows.push({
          response_id: responseId,
          question_id: a.question_id,
          option_id: null,
          text_answer: a.text_answer,
          row_label: null,
        });
      }
      for (const optionId of a.option_ids ?? []) {
        rows.push({
          response_id: responseId,
          question_id: a.question_id,
          option_id: optionId,
          text_answer: null,
          row_label: null,
        });
      }
      for (const g of a.grid_answers ?? []) {
        for (const col of g.columns) {
          rows.push({
            response_id: responseId,
            question_id: a.question_id,
            option_id: null,
            text_answer: col,
            row_label: g.row,
          });
        }
      }
    }

    if (rows.length > 0) {
      const { error: aError } = await this.supabase.from('answers').insert(rows);
      if (aError) throwDbError(aError, 'answers.insert');
    }
  }

  async findAnswersBySurvey(surveyId: string): Promise<Answer[]> {
    // responses経由でsurveyに紐づくanswersを取得
    const { data: sessions, error: sError } = await this.supabase
      .from('responses')
      .select('id')
      .eq('survey_id', surveyId);
    if (sError) throwDbError(sError, 'responses.list');

    const ids = (sessions ?? []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return [];

    // CSV出力などで行の並びが毎回変わらないよう、順序を明示して取得する
    const { data, error } = await this.supabase
      .from('answers')
      .select('*')
      .in('response_id', ids)
      .order('response_id', { ascending: true })
      .order('id', { ascending: true });
    if (error) throwDbError(error, 'answers.list');
    return (data ?? []) as Answer[];
  }

  async findSessionsBySurvey(surveyId: string): Promise<ResponseSession[]> {
    const { data, error } = await this.supabase
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true });
    if (error) throwDbError(error, 'responses');
    return (data ?? []) as ResponseSession[];
  }
}
