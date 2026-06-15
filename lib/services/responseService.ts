import type { SupabaseClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { SurveyRepository } from '@/lib/repositories/surveyRepository';
import { ResponseRepository } from '@/lib/repositories/responseRepository';
import type {
  AnswerInput,
  QuestionAggregate,
  SurveyWithQuestions,
  UserResponse,
} from '@/lib/types/database';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import { computeVisibleQuestionIds } from '@/lib/domain/questions/visibility';
import {
  createQualityEvaluator,
  grade,
  sanitizeItems,
  shouldCallLLM,
  RuleBasedEvaluator,
  type EvaluationItem,
  type MechSignals,
  type QualityHints,
  type QualityResult,
} from '@/lib/domain/quality';
import { AttentionCheckQuestion } from '@/lib/domain/questions/AttentionQuestion';

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
  /**
   * 低品質と判定され「保存せずに」差し戻したか。
   * true の場合、回答者は内容を見直して再送信できる（一方的ペナルティの救済）。
   */
  rejected: boolean;
}

/** submitResponse の付帯オプション */
export interface SubmitOptions {
  /** 回答開始〜送信までの所要秒数（クライアント計測） */
  durationSec?: number;
  /**
   * 低品質判定でもそのまま保存する（0pt＋信頼スコア減点を受け入れる）。
   * 差し戻し後の再送信でユーザーが明示した場合のみ true。
   */
  acceptLowQuality?: boolean;
  /**
   * クライアント由来の不正シグナルのヒント（paste/aiStyle/inputDynamics）。
   * ルーティング（LLMを呼ぶか）の判断材料に使う。
   * TODO(S2/S3): フォーム側でこれらのヒントを計測して供給する。
   */
  qualityHints?: QualityHints;
}

/** アンケート回答・結果集計のビジネスロジック */
export class ResponseService {
  private readonly surveyRepo: SurveyRepository;
  private readonly responseRepo: ResponseRepository;
  private readonly profileRepo: ProfileRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.surveyRepo = new SurveyRepository(supabase);
    this.responseRepo = new ResponseRepository(supabase);
    this.profileRepo = new ProfileRepository(supabase);
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
   * 共有リンク（ゲスト回答）用にアンケートを取得する。
   * トークンを知っていれば未ログインでも回答できる（ポイント付与なし）。
   * 重複回答の判定はゲストキー（Cookie）単位でDBの一意制約が行う。
   */
  async getSurveyForGuest(shareToken: string): Promise<SurveyWithQuestions> {
    const survey = await this.surveyRepo.findByShareToken(shareToken);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは現在回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    return survey;
  }

  /**
   * 共有リンクからログイン済みユーザーが回答するためのアンケート取得。
   * トークンでアンケートを引き、通常の回答可能チェック（自作・回答済みなど）を行う。
   */
  async getSurveyForSharedLinkAuth(
    userId: string,
    shareToken: string
  ): Promise<SurveyWithQuestions> {
    const survey = await this.surveyRepo.findByShareToken(shareToken);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは現在回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    if (survey.user_id === userId) throw new Error('自分が作成したアンケートには回答できません');
    if (await this.responseRepo.hasResponded(survey.id, userId)) {
      throw new Error('このアンケートにはすでに回答済みです');
    }
    return survey;
  }

  /**
   * 共有リンクからのログイン済み回答送信。
   * survey.share_link_no_reward が true の場合は earnedPoints を強制0にする。
   * それ以外は通常の品質評価＋ポイント付与を行う。
   */
  async submitSharedLinkResponse(
    userId: string,
    shareToken: string,
    answers: AnswerInput[],
    options: SubmitOptions = {}
  ): Promise<SubmitResult> {
    const survey = await this.getSurveyForSharedLinkAuth(userId, shareToken);

    if (survey.share_link_no_reward) {
      // 0ptモード：整合性チェックのみ行い品質評価はスキップ
      this.assertAnswerIntegrity(survey, answers);
      const visibleAnswers = this.validateAndFilterVisible(survey, answers);
      const outcome = await this.responseRepo.submitWithRewards(
        survey.id,
        visibleAnswers,
        0,
        0,
        options.durationSec ?? null
      );
      return {
        score: 0,
        feedback: 'ポイント付与なし（作成者の設定により）',
        earnedPoints: 0,
        surveyClosed: outcome.closed,
        rejected: false,
      };
    }

    // 通常モード：品質評価＋ポイント付与（survey.id を直接使う）
    return this.submitResponse(userId, survey.id, answers, options);
  }

  /**
   * ゲスト回答の送信（共有リンク経由・未ログイン可）。
   * ログイン回答と同じ整合性検証・必須検証を行うが、AI品質評価・ポイント付与・
   * 信頼スコア更新は行わない。保存と自動closeはRPCが1トランザクションで行う。
   */
  async submitGuestResponse(
    shareToken: string,
    answers: AnswerInput[],
    guestKey: string,
    durationSec?: number
  ): Promise<{ surveyClosed: boolean }> {
    const survey = await this.getSurveyForGuest(shareToken);

    this.assertAnswerIntegrity(survey, answers);
    const visibleAnswers = this.validateAndFilterVisible(survey, answers);

    const outcome = await this.responseRepo.submitGuest(
      shareToken,
      visibleAnswers,
      guestKey,
      durationSec ?? null
    );
    return { surveyClosed: outcome.closed };
  }

  /**
   * 回答が「このアンケートの設問」と「その設問の選択肢」だけを参照していることを
   * 確認する。他設問・他アンケートの option_id を混入させた改ざん payload や、
   * 同一設問への重複回答をここで弾く。
   */
  private assertAnswerIntegrity(survey: SurveyWithQuestions, answers: AnswerInput[]): void {
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
  }

  /**
   * 条件付き表示を解決し、表示される設問のみ必須・形式検証して
   * 保存対象（表示設問の回答だけ）を返す。
   */
  private validateAndFilterVisible(
    survey: SurveyWithQuestions,
    answers: AnswerInput[]
  ): AnswerInput[] {
    const optionTextById = new Map<string, string>();
    survey.questions.forEach((q) =>
      q.options.forEach((o) => optionTextById.set(o.id, o.text))
    );
    const selectedTexts = (questionId: string): string[] => {
      const a = answers.find((x) => x.question_id === questionId);
      return (a?.option_ids ?? []).map((id) => optionTextById.get(id) ?? '');
    };
    const visibleIds = computeVisibleQuestionIds(survey.questions, selectedTexts);

    for (const q of survey.questions) {
      if (!visibleIds.has(q.id)) continue;
      const a = answers.find((x) => x.question_id === q.id);
      QuestionTypeRegistry.get(q.type).validateAnswer(a, q);
    }
    return answers.filter((a) => visibleIds.has(a.question_id));
  }

  /**
   * 回答送信。保存後に AI品質評価を行い、スコアに応じた倍率でポイントを付与する。
   * スコア0（アテンションチェック誤答等）の場合は信頼スコアを5減点する（DESIGN_SPEC §2）。
   */
  async submitResponse(
    userId: string,
    surveyId: string,
    answers: AnswerInput[],
    options: SubmitOptions = {}
  ): Promise<SubmitResult> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.status !== 'open') throw new Error('このアンケートは回答を受け付けていません');
    if (this.isExpired(survey)) throw new Error('このアンケートは回答期限を過ぎています');
    if (survey.user_id === userId) throw new Error('自分のアンケートには回答できません');

    const already = await this.responseRepo.hasResponded(surveyId, userId);
    if (already) throw new Error('すでに回答済みです');

    this.assertAnswerIntegrity(survey, answers);

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
      // アテンションチェック設問は config の正解選択肢を評価器へ供給する
      correctOptionText:
        q.type === 'attention'
          ? AttentionCheckQuestion.correctOptionText(q.config) ?? undefined
          : undefined,
      answer: answers.find((a) => a.question_id === q.id),
    }));
    const ctx = { durationSec: options.durationSec };

    // 送信前サニタイズ（設計書 §2）：LLM へ渡す前に必ず通す（S3実装をバレル経由で import）。
    const sanitized = sanitizeItems(items);

    // 機械シグナル（設計書 §2/§3）：ルールベース評価（床）＋クライアントヒント。
    // LLM を呼ぶ前に得られる安価な信号で、ルーティングと grade の双方が参照する。
    const ruleResult = await new RuleBasedEvaluator().evaluate(sanitized, ctx);
    const mech: MechSignals = {
      rulePass: ruleResult.score >= 100,
      ruleScore: ruleResult.score,
      hints: options.qualityHints,
      durationSec: options.durationSec,
    };

    // ルーティング（設計書 §3）：LLM を呼ぶか機械評価のみで確定するか分岐する。
    // TODO(S2): RoutingUser に信頼スコア等を供給して連動させる。
    const routing = shouldCallLLM(sanitized, mech, {});
    const quality: QualityResult = routing.callLLM
      ? await createQualityEvaluator().evaluate(sanitized, ctx)
      : ruleResult;

    // 最終グレーディング（設計書 §1/§7）：ティアと付与率を決定（S5実装をバレル経由で import）。
    const gradeResult = grade(quality, mech);
    const result = { score: gradeResult.score, feedback: gradeResult.feedback };
    const multiplier = gradeResult.payoutRate;

    // 低品質（付与率0）の場合は即ペナルティを与えず、保存前に差し戻して
    // 再回答を促す（B#11 の一方的ペナルティの救済）。
    // ユーザーが acceptLowQuality を明示した再送信のみ、そのまま保存する。
    if (multiplier === 0 && !options.acceptLowQuality) {
      return {
        score: result.score,
        feedback: result.feedback,
        earnedPoints: 0,
        surveyClosed: false,
        rejected: true,
      };
    }

    // 基本コスト＝表示設問のポイントコスト合計（最低1）
    const baseCost = Math.max(
      1,
      visibleQuestions.reduce((sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost, 0)
    );
    // 付与率（payoutRate）を下流の報酬付与RPCへ反映する。RPCの契約は earnedPoints
    // （= 基本コスト × payoutRate）のままなので、ここで換算して渡す。
    const earnedPoints = Math.round(baseCost * multiplier);
    const trustDelta = gradeResult.tier === 'T0' ? -5 : 0;

    // 回答保存＋回答者への報酬付与＋作成者からの品質比例課金＋信頼スコア更新＋
    // 上限到達時の自動closeを1トランザクション（RPC）で実行する。
    // 作成者の消費額は付与額と同額（低品質0pt〜高品質×1.5）で、DB側が算出・消費する。
    // 失敗時はすべてロールバックされるため、「回答済みなのにポイント未付与・
    // 再回答不可」という不可逆状態にならない。
    const outcome = await this.responseRepo.submitWithRewards(
      surveyId,
      visibleAnswers,
      earnedPoints,
      trustDelta,
      options.durationSec ?? null
    );

    return {
      score: result.score,
      feedback: result.feedback,
      earnedPoints,
      surveyClosed: outcome.closed,
      rejected: false,
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
   * ユーザー別回答一覧を取得する（作成者のみ・Proプラン用）。
   * ゲスト回答（user_id null）は「ゲスト」として含める。
   */
  async getPerUserResults(
    userId: string,
    surveyId: string
  ): Promise<{ survey: SurveyWithQuestions; userResponses: UserResponse[] }> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.user_id !== userId) throw new Error('結果を閲覧する権限がありません');

    const sessions = await this.responseRepo.findSessionsBySurvey(surveyId);
    const answers = await this.responseRepo.findAnswersBySurvey(surveyId);

    const userIds = [...new Set(sessions.map((s) => s.user_id).filter((id): id is string => id !== null))];
    const profiles = await this.profileRepo.findByIds(userIds);

    const byResponse = new Map<string, typeof answers>();
    for (const a of answers) {
      const list = byResponse.get(a.response_id) ?? [];
      list.push(a);
      byResponse.set(a.response_id, list);
    }

    const userResponses: UserResponse[] = sessions.map((s) => {
      const profile = s.user_id ? profiles.get(s.user_id) : undefined;
      return {
        responseId: s.id,
        userId: s.user_id,
        nickname: profile?.nickname ?? 'ゲスト',
        avatarUrl: profile?.avatar_url ?? null,
        createdAt: s.created_at,
        answers: byResponse.get(s.id) ?? [],
      };
    });

    return { survey, userResponses };
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

    const header = ['タイムスタンプ', ...survey.questions.map((q, i) => `Q${i + 1}: ${q.text}`)];
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

  /** 結果をExcel（.xlsx）バイナリで出力する（作成者のみ）。 */
  async getResultXlsx(
    userId: string,
    surveyId: string
  ): Promise<{ filename: string; buffer: Buffer }> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.user_id !== userId) throw new Error('結果を閲覧する権限がありません');

    const sessions = await this.responseRepo.findSessionsBySurvey(surveyId);
    const answers = await this.responseRepo.findAnswersBySurvey(surveyId);

    const byResponse = new Map<string, typeof answers>();
    for (const a of answers) {
      const list = byResponse.get(a.response_id) ?? [];
      list.push(a);
      byResponse.set(a.response_id, list);
    }

    const header = ['タイムスタンプ', ...survey.questions.map((q, i) => `Q${i + 1}: ${q.text}`)];
    const rows = sessions.map((s) => {
      const mine = byResponse.get(s.id) ?? [];
      const cells = survey.questions.map((q) => {
        const forQ = mine.filter((a) => a.question_id === q.id);
        return QuestionTypeRegistry.get(q.type).renderAnswerText(forQ, q);
      });
      return [new Date(s.created_at).toLocaleString('ja-JP'), ...cells];
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('回答データ');

    // ヘッダー行
    const headerRow = ws.addRow(header);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });

    // データ行（1行おきに薄い背景色）
    rows.forEach((row, ri) => {
      const dataRow = ws.addRow(row);
      const fill: ExcelJS.Fill = ri % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = fill;
        cell.border = {
          top: { style: 'hair' }, bottom: { style: 'hair' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // 列幅をコンテンツに合わせて調整（最大60文字）
    ws.columns.forEach((col, ci) => {
      const maxLen = [header[ci], ...rows.map((r) => r[ci] ?? '')].reduce(
        (max, v) => Math.max(max, String(v ?? '').length),
        10
      );
      col.width = Math.min(maxLen + 2, 60);
    });

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { filename: `${survey.title || 'survey'}_results.xlsx`, buffer };
  }
}

/**
 * CSVの1セルをエスケープする。
 *  - CSVインジェクション対策：= + - @ タブ CR で始まるセルは Excel が数式として
 *    実行する恐れがあるため、先頭にシングルクォートを前置して無害化する
 *  - カンマ・改行・引用符を含む場合は引用符で囲む
 */
function escapeCsv(value: string): string {
  let v = value ?? '';
  if (/^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
