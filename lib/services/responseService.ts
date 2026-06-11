import type { SupabaseClient } from '@supabase/supabase-js';
import { SurveyRepository } from '@/lib/repositories/surveyRepository';
import { ResponseRepository } from '@/lib/repositories/responseRepository';
import type {
  AnswerInput,
  QuestionAggregate,
  SurveyWithQuestions,
} from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import { computeVisibleQuestionIds } from '@/lib/domain/questions/visibility';
import {
  createQualityEvaluator,
  scoreToMultiplier,
  type EvaluationItem,
} from '@/lib/domain/quality';

/** 回答送信の結果（品質評価とポイント付与のサマリ） */
export interface SubmitResult {
  /** 品質スコア 0〜100 */
  score: number;
  /** 日本語フィードバック */
  feedback: string;
  /** 今回付与されたポイント */
  earnedPoints: number;
  /** この回答で必要回答数に到達し、アンケートが自動で締め切られたか */
  surveyClosed: boolean;
}

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

  /**
   * 回答送信。保存後に AI品質評価を行い、スコアに応じた倍率でポイントを付与する。
   * スコア0（アテンションチェック誤答等）の場合は信頼スコアを5減点する（DESIGN_SPEC §2）。
   */
  async submitResponse(
    userId: string,
    surveyId: string,
    answers: AnswerInput[]
  ): Promise<SubmitResult> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    if (survey.user_id === userId) throw new Error('自分のアンケートには回答できません');

    const already = await this.responseRepo.hasResponded(surveyId, userId);
    if (already) throw new Error('すでに回答済みです');

    // 防御的検証：回答が「このアンケートの設問」と「その設問の選択肢」だけを
    // 参照していることを確認する。他設問・他アンケートの option_id を混入させた
    // 改ざんpayloadや、同一設問への重複回答をここで弾く。
    const questionById = new Map(survey.questions.map((q) => [q.id, q]));
    const seenQuestionIds = new Set<string>();
    for (const a of answers) {
      const q = questionById.get(a.question_id);
      if (!q) throw new Error('回答データの形式が不正です');
      if (seenQuestionIds.has(a.question_id)) throw new Error('回答データの形式が不正です');
      seenQuestionIds.add(a.question_id);
      const validOptionIds = new Set(q.options.map((o) => o.id));
      for (const id of a.option_ids ?? []) {
        if (!validOptionIds.has(id)) throw new Error('回答データの形式が不正です');
      }
    }

    // 条件付き表示：実際に表示される設問のみを必須・形式検証＆保存対象とする。
    // 回答者が選んだ選択肢のテキストは、送信された option_ids から逆引きする。
    const optionTextById = new Map<string, string>();
    survey.questions.forEach((q) =>
      q.options.forEach((o) => optionTextById.set(o.id, o.text))
    );
    const selectedTexts = (questionId: string): string[] => {
      const a = answers.find((x) => x.question_id === questionId);
      return (a?.option_ids ?? []).map((id) => optionTextById.get(id) ?? '');
    };
    const visibleIds = computeVisibleQuestionIds(survey.questions, selectedTexts);

    // 表示されている設問だけを検証する（非表示の条件設問は未回答でも問題なし）
    for (const q of survey.questions) {
      if (!visibleIds.has(q.id)) continue;
      const a = answers.find((x) => x.question_id === q.id);
      QuestionTypeRegistry.get(q.type).validateAnswer(a, q);
    }

    // 非表示設問の回答は保存しない
    const visibleAnswers = answers.filter((a) => visibleIds.has(a.question_id));

    // ── AI品質評価（DESIGN_SPEC §2）。保存前に評価し、保存・付与はまとめて行う ──
    const visibleQuestions = survey.questions.filter((q) => visibleIds.has(q.id));
    const items: EvaluationItem[] = visibleQuestions.map((q) => ({
      question: q,
      answer: answers.find((a) => a.question_id === q.id),
    }));
    const result = await createQualityEvaluator().evaluate(items);
    const multiplier = scoreToMultiplier(result.score);

    // 基本コスト＝表示設問のポイントコスト合計（最低1）
    const baseCost = Math.max(
      1,
      visibleQuestions.reduce((sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost, 0)
    );
    const earnedPoints = Math.round(baseCost * multiplier);
    const trustDelta = result.score === 0 ? -5 : 0;

    // 回答保存＋ポイント付与＋信頼スコア更新＋上限到達時の自動closeを
    // 1トランザクション（RPC）で実行する。失敗時はすべてロールバックされるため、
    // 「回答済みなのにポイント未付与・再回答不可」という不可逆状態にならない。
    const outcome = await this.responseRepo.submitWithRewards(
      surveyId,
      visibleAnswers,
      earnedPoints,
      trustDelta
    );

    return {
      score: result.score,
      feedback: result.feedback,
      earnedPoints,
      surveyClosed: outcome.closed,
    };
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
