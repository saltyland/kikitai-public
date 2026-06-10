import type { SupabaseClient } from '@supabase/supabase-js';
import { SurveyRepository } from '@/lib/repositories/surveyRepository';
import { ResponseRepository } from '@/lib/repositories/responseRepository';
import type {
  AnswerInput,
  QuestionAggregate,
  SurveyWithQuestions,
} from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';

/** アンケート回答・結果集計のビジネスロジック */
export class ResponseService {
  private readonly surveyRepo: SurveyRepository;
  private readonly responseRepo: ResponseRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.surveyRepo = new SurveyRepository(supabase);
    this.responseRepo = new ResponseRepository(supabase);
  }

  /** 期限切れ（deadlineが過去）かどうか */
  private isExpired(survey: SurveyWithQuestions): boolean {
    if (!survey.deadline) return false;
    const today = new Date().toISOString().split('T')[0];
    return survey.deadline < today;
  }

  /**
   * 回答フォーム表示用に設問つきアンケートを取得。
   * 直接URLでアクセスされても、回答不可の条件（非公開・期限切れ・自作・回答済み）を
   * ここで弾き、フォームを表示しないようにする。
   */
  async getSurveyForAnswer(userId: string, surveyId: string): Promise<SurveyWithQuestions> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは現在回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    if (survey.user_id === userId) throw new Error('自分が作成したアンケートには回答できません');
    if (await this.responseRepo.hasResponded(surveyId, userId)) {
      throw new Error('このアンケートにはすでに回答済みです');
    }
    return survey;
  }

  /** 回答送信 */
  async submitResponse(
    userId: string,
    surveyId: string,
    answers: AnswerInput[]
  ): Promise<void> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    if (survey.user_id === userId) throw new Error('自分のアンケートには回答できません');

    const already = await this.responseRepo.hasResponded(surveyId, userId);
    if (already) throw new Error('すでに回答済みです');

    // 各設問の回答（必須・形式）を、各設問タイプ定義に委譲して検証する
    for (const q of survey.questions) {
      const a = answers.find((x) => x.question_id === q.id);
      QuestionTypeRegistry.get(q.type).validateAnswer(a, q);
    }

    await this.responseRepo.saveResponse(surveyId, userId, answers);
  }

  /** 結果確認（作成者のみ） */
  async getResults(
    userId: string,
    surveyId: string
  ): Promise<{ survey: SurveyWithQuestions; responseCount: number; aggregates: QuestionAggregate[] }> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.user_id !== userId) throw new Error('結果を閲覧する権限がありません');

    const responseCount = await this.surveyRepo.countResponses(surveyId);
    const answers = await this.responseRepo.findAnswersBySurvey(surveyId);

    // 集計も設問タイプ定義に委譲する（タイプ追加時もこの集計コードは変更不要）
    const aggregates: QuestionAggregate[] = survey.questions.map((q) =>
      QuestionTypeRegistry.get(q.type).aggregate(q, answers)
    );

    return { survey, responseCount, aggregates };
  }

  /**
   * 結果をCSV文字列で出力する（作成者のみ）。
   * 1行＝1回答セッション。列＝タイムスタンプ＋各設問。
   * 設問ごとの整形は各設問タイプ定義の renderAnswerText に委譲する。
   */
  async getResultCsv(
    userId: string,
    surveyId: string
  ): Promise<{ filename: string; csv: string }> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.user_id !== userId) throw new Error('結果を閲覧する権限がありません');

    const sessions = await this.responseRepo.findSessionsBySurvey(surveyId);
    const answers = await this.responseRepo.findAnswersBySurvey(surveyId);

    // response_id ごとに回答をまとめる
    const byResponse = new Map<string, typeof answers>();
    for (const a of answers) {
      const list = byResponse.get(a.response_id) ?? [];
      list.push(a);
      byResponse.set(a.response_id, list);
    }

    const header = ['タイムスタンプ', ...survey.questions.map((q) => q.text)];
    const rows = sessions.map((s) => {
      const mine = byResponse.get(s.id) ?? [];
      const cells = survey.questions.map((q) => {
        const forQ = mine.filter((a) => a.question_id === q.id);
        return QuestionTypeRegistry.get(q.type).renderAnswerText(forQ, q);
      });
      return [new Date(s.created_at).toLocaleString('ja-JP'), ...cells];
    });

    const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\r\n');
    // Excelの文字化け対策にBOMを付与する
    return { filename: `${survey.title || 'survey'}_results.csv`, csv: '﻿' + csv };
  }
}

/** CSVの1セルをエスケープする（カンマ・改行・引用符を含む場合は引用符で囲む） */
function escapeCsv(value: string): string {
  const v = value ?? '';
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
