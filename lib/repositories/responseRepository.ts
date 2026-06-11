import type { SupabaseClient } from '@supabase/supabase-js';
import type { Answer, AnswerInput, ResponseSession } from '@/lib/types/database';
import { BaseRepository } from './baseRepository';
import { throwDbError, throwRpcError } from './dbError';

/** submit_survey_response RPC の戻り値 */
export interface SubmitOutcome {
  /** 送信後のこのアンケートの総回答数 */
  response_count: number;
  /** 必要回答数に到達して自動closeされたか */
  closed: boolean;
}

/** 回答セッション・個別回答のDBアクセスを抽象化するインターフェース */
export interface IResponseRepository {
  hasResponded(surveyId: string, userId: string): Promise<boolean>;
  /** 指定ユーザーが回答済みのアンケートidを1クエリでまとめて取得する（一覧表示のN+1対策） */
  findRespondedSurveyIds(userId: string, surveyIds: string[]): Promise<Set<string>>;
  /**
   * 回答保存＋報酬ポイント付与＋信頼スコア更新＋上限到達時の自動closeを
   * RPC（submit_survey_response）で1トランザクションとして実行する。
   * 途中で失敗した場合はすべてロールバックされる（「回答済みなのに0pt」を防ぐ）。
   */
  submitWithRewards(
    surveyId: string,
    answers: AnswerInput[],
    earnedPoints: number,
    trustDelta: number
  ): Promise<SubmitOutcome>;
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

  async submitWithRewards(
    surveyId: string,
    answers: AnswerInput[],
    earnedPoints: number,
    trustDelta: number
  ): Promise<SubmitOutcome> {
    const { data, error } = await this.supabase.rpc('submit_survey_response', {
      p_survey_id: surveyId,
      p_answers: this.buildAnswerRows(answers),
      p_earned_points: earnedPoints,
      p_trust_delta: trustDelta,
    });
    if (error) throwRpcError(error, 'submit_survey_response');
    return data as SubmitOutcome;
  }

  /**
   * 回答入力を answers テーブルの行形式に展開する。
   *  - multiple: 選択肢ごとに1行
   *  - grid: 行×選択列ごとに1行（row_labelに行ラベル、text_answerに列ラベル）
   */
  private buildAnswerRows(
    answers: AnswerInput[]
  ): Omit<Answer, 'id' | 'response_id'>[] {
    const rows: Omit<Answer, 'id' | 'response_id'>[] = [];
    for (const a of answers) {
      if (a.text_answer !== undefined && a.text_answer !== null && a.text_answer !== '') {
        rows.push({
          question_id: a.question_id,
          option_id: null,
          text_answer: a.text_answer,
          row_label: null,
        });
      }
      for (const optionId of a.option_ids ?? []) {
        rows.push({
          question_id: a.question_id,
          option_id: optionId,
          text_answer: null,
          row_label: null,
        });
      }
      for (const g of a.grid_answers ?? []) {
        for (const col of g.columns) {
          rows.push({
            question_id: a.question_id,
            option_id: null,
            text_answer: col,
            row_label: g.row,
          });
        }
      }
    }
    return rows;
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
