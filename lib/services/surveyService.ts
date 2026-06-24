import type { SupabaseClient } from '@supabase/supabase-js';
import { SurveyRepository } from '@/lib/repositories/surveyRepository';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { ResponseRepository } from '@/lib/repositories/responseRepository';
import { FollowRepository } from '@/lib/repositories/followRepository';
import type {
  Survey,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
  SurveyWithStats,
  QuestionInput,
} from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import { SurveyStateMachine } from '@/lib/domain/surveyStateMachine';
import { isUnrestricted, matches } from '@/lib/domain/matching';
import { getLocalEncoder } from '@/lib/domain/quality/embedding/factory';
import {
  buildReferenceVectors,
  type ReferenceSource,
} from '@/lib/domain/quality/referenceVector';

/** アンケート作成・編集・一覧・状態管理のビジネスロジック */
export class SurveyService {
  private readonly surveyRepo: SurveyRepository;
  private readonly profileRepo: ProfileRepository;
  private readonly responseRepo: ResponseRepository;
  private readonly followRepo: FollowRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.surveyRepo = new SurveyRepository(supabase);
    this.profileRepo = new ProfileRepository(supabase);
    this.responseRepo = new ResponseRepository(supabase);
    this.followRepo = new FollowRepository(supabase);
  }

  /** 入力バリデーション。設問タイプ固有の検証はレジストリ経由で各タイプ定義に委譲する。 */
  private validate(input: SurveyInput): void {
    if (!input.title.trim()) throw new Error('タイトルは必須です');
    if (input.required_count < 1) throw new Error('必要回答数は1以上にしてください');
    if (input.questions.length === 0) throw new Error('設問を1つ以上追加してください');
    // インフォームドコンセント文は「あり/なし」を作成者が選べる（任意）。
    // 「なし」の場合は consent_text が null となり、回答画面では汎用の説明文を表示する。
    input.questions.forEach((q: QuestionInput, i: number) => {
      if (!q.text.trim()) throw new Error(`設問${i + 1}の文章を入力してください`);
      QuestionTypeRegistry.get(q.type).validateDefinition(q, i + 1);
    });
  }

  /** 設問入力をDB保存用の行に変換する。選択肢・設定の生成は各設問タイプ定義に委譲する。 */
  private toQuestionRows(questions: QuestionInput[]) {
    return questions.map((q, qi) => {
      const def = QuestionTypeRegistry.get(q.type);
      // 表示条件は「自分より前の設問」だけを参照できる（循環・前方参照を防ぐ）
      const condition =
        q.condition &&
        q.condition.sourceQuestionOrder >= 0 &&
        q.condition.sourceQuestionOrder < qi &&
        q.condition.optionText
          ? q.condition
          : null;
      return {
        type: q.type,
        text: q.text.trim(),
        description: q.description?.trim() || null,
        required: !!q.required,
        config: def.buildConfig(q),
        section_index: Math.max(0, q.section_index ?? 0),
        order_index: qi,
        condition,
        options: def.buildOptions(q),
      };
    });
  }

  /**
   * 設問1セット分のポイントコスト（設問タイプ別単価の合計）を試算する。
   * 1回答が平均品質（×1.0）だった場合に作成者が消費するポイントの目安。
   * 実際の消費は回答ごとにDB側の submit_survey_response RPC が品質倍率
   * （低品質0〜高品質×1.5）で計算する
   * （supabase/migrations の question_point_cost と同期を保つこと）。
   */
  estimateCost(input: SurveyInput): number {
    return input.questions.reduce(
      (sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost,
      0
    );
  }

  /** 全回答が平均品質だった場合の総消費ポイントの目安（required_count × 設問コスト、切り上げ） */
  estimatePublishCost(input: SurveyInput): number {
    return Math.ceil(input.required_count * this.estimateCost(input));
  }

  /** セクション（ページ）メタ情報を正規化する */
  private sanitizeSections(input: SurveyInput) {
    return (input.sections ?? []).map((s) => ({
      title: (s.title ?? '').trim(),
      description: (s.description ?? '').trim(),
    }));
  }

  /** 入力から保存用の共通カラム値を組み立てる（作成・更新で共用） */
  private toSurveyColumns(input: SurveyInput) {
    return {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      required_count: input.required_count,
      deadline: input.deadline || null,
      status: input.status,
      sections: this.sanitizeSections(input),
      consent_text: input.consent_text?.trim() || null,
      // 実質未設定（全項目空）の条件は null に正規化して「全員に配信」とする
      target_conditions: isUnrestricted(input.target_conditions) ? null : input.target_conditions,
      min_trust_score: input.min_trust_score,
      retention_until: this.computeRetentionUntil(input.retention_months),
      visibility: input.visibility,
      share_link_no_reward: input.visibility === 'unlisted',
    };
  }

  /** データ保持期間（月数）から保持期限日時を算出する。null＝無期限。 */
  private computeRetentionUntil(months: number | null): string | null {
    if (!months || months < 1) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }

  /**
   * 参照ベクトル群を生成して survey に保存する（設計書 §13.2 作成フェーズ）。
   *
   * - すべて同一のローカルエンコーダで埋め込む（補正2）。外部LLM埋め込みとは混ぜない。
   * - 最小実装は「設問文（＋説明文をキー概念）」からの生成。作成者が任意入力する
   *   理想回答例文（idealAnswers）を渡せば領域化（補正3）が効く。
   * - **ベストエフォート**：埋め込み生成に失敗してもアンケート作成/公開自体は止めない。
   */
  private async saveReferenceVectors(surveyId: string, sources: ReferenceSource[]): Promise<void> {
    if (sources.length === 0) return;
    try {
      const encoder = await getLocalEncoder();
      const refs = await buildReferenceVectors(encoder, sources);
      // reference_vectors は Survey 型（S1管理の types.ts）に未定義のため型を緩める。
      // DBには本マイグレーションで追加した jsonb 列として書き込まれる。
      await this.surveyRepo.updateSurvey(
        surveyId,
        { reference_vectors: refs } as unknown as Partial<Omit<Survey, 'id' | 'user_id' | 'created_at'>>
      );
    } catch (e) {
      // 参照ベクトルは品質評価の「関連性軸」補助であり、無くても回答受付・評価は成立する。
      console.error('[surveyService] 参照ベクトル生成に失敗（処理は継続）:', e);
    }
  }

  /** 設問入力から参照生成の入力（設問文＋説明文をキー概念）を組み立てる。 */
  private toReferenceSources(questions: QuestionInput[]): ReferenceSource[] {
    return questions
      .map((q, qi) => ({
        questionOrder: qi,
        questionText: q.text.trim(),
        keyConcepts: q.description?.trim() ? [q.description.trim()] : undefined,
      }))
      .filter((s) => s.questionText.length > 0);
  }

  /** 新規作成 */
  async createSurvey(userId: string, input: SurveyInput): Promise<Survey> {
    this.validate(input);
    const survey = await this.surveyRepo.insertSurvey({
      user_id: userId,
      ...this.toSurveyColumns(input),
    });
    await this.surveyRepo.replaceQuestions(survey.id, this.toQuestionRows(input.questions));
    await this.saveReferenceVectors(survey.id, this.toReferenceSources(input.questions));
    return survey;
  }

  /** 編集（所有者チェック込み） */
  async updateSurvey(userId: string, surveyId: string, input: SurveyInput): Promise<Survey> {
    this.validate(input);
    const existing = await this.surveyRepo.findById(surveyId);
    if (!existing) throw new Error('アンケートが見つかりません');
    if (existing.user_id !== userId) throw new Error('編集権限がありません');
    // 公開後の設問変更は集計データとの不整合を生むため、下書きのみ編集可とする
    if (existing.status !== 'draft') {
      throw new Error('公開中・終了したアンケートは編集できません（下書きのみ編集可）');
    }

    const survey = await this.surveyRepo.updateSurvey(surveyId, this.toSurveyColumns(input));
    await this.surveyRepo.replaceQuestions(surveyId, this.toQuestionRows(input.questions));
    await this.saveReferenceVectors(surveyId, this.toReferenceSources(input.questions));
    return survey;
  }

  async getSurveyForEdit(userId: string, surveyId: string): Promise<SurveyWithQuestions> {
    const survey = await this.surveyRepo.findWithQuestions(surveyId);
    if (!survey) throw new Error('アンケートが見つかりません');
    if (survey.user_id !== userId) throw new Error('編集権限がありません');
    if (survey.status !== 'draft') {
      throw new Error('公開中・終了したアンケートは編集できません（下書きのみ編集可）');
    }
    return survey;
  }

  async changeStatus(userId: string, surveyId: string, status: SurveyStatus): Promise<void> {
    const existing = await this.surveyRepo.findById(surveyId);
    if (!existing) throw new Error('アンケートが見つかりません');
    if (existing.user_id !== userId) throw new Error('操作権限がありません');

    // ステートマシン：draft→open / open→closed 以外の遷移
    // （closed→open の再オープン等）を拒否する。DBトリガーでも二重に防護。
    SurveyStateMachine.assertTransition(existing.status, status);

    // インフォームドコンセント文は任意（あり/なし選択可）のため、公開時の必須チェックは行わない。

    // 公開（draft→open）。ポイントは公開時には消費せず、回答が届くたびに
    // 品質に応じて消費される（submit_survey_response）。公開時は最低残高
    // （1回答分）のチェックのみDB側RPCが行い、不足時は BusinessRuleError
    // （INSUFFICIENT_POINTS）で公開を拒否する。
    if (existing.status === 'draft' && status === 'open') {
      await this.surveyRepo.publish(surveyId);
      // 公開時にも参照ベクトルを生成しておく（作成時に未生成・失敗していた場合の保険）。
      const withQuestions = await this.surveyRepo.findWithQuestions(surveyId);
      if (withQuestions) {
        await this.saveReferenceVectors(
          surveyId,
          withQuestions.questions.map((q) => ({
            questionOrder: q.order_index,
            questionText: q.text.trim(),
            keyConcepts: q.description?.trim() ? [q.description.trim()] : undefined,
          }))
        );
      }
      return;
    }
    await this.surveyRepo.updateStatus(surveyId, status);
  }

  async deleteSurvey(userId: string, surveyId: string): Promise<void> {
    const existing = await this.surveyRepo.findById(surveyId);
    if (!existing) throw new Error('アンケートが見つかりません');
    if (existing.user_id !== userId) throw new Error('削除権限がありません');
    await this.surveyRepo.delete(surveyId);
  }

  /** 他人のプロフィールページ：公開中アンケートのみ（回答数つき）。 */
  async listSurveysByUser(targetUserId: string): Promise<SurveyWithStats[]> {
    const surveys = (await this.surveyRepo.findByOwner(targetUserId)).filter(
      (s) => s.status === 'open' && s.visibility === 'public'
    );
    const counts = await this.surveyRepo.countResponsesBySurveyIds(surveys.map((s) => s.id));
    return surveys.map((s) => ({
      ...s,
      response_count: counts.get(s.id) ?? 0,
    }));
  }

  /** ホーム画面：自分が作成したアンケート一覧（回答数つき）。回答数は1クエリで一括取得する。 */
  async listMySurveys(userId: string): Promise<SurveyWithStats[]> {
    const surveys = await this.surveyRepo.findByOwner(userId);
    const counts = await this.surveyRepo.countResponsesBySurveyIds(surveys.map((s) => s.id));
    return surveys.map((s) => ({
      ...s,
      response_count: counts.get(s.id) ?? 0,
    }));
  }

  /**
   * アンケート配列に回答数・作成者・設問プレビュー・報酬目安を付与し、
   * 自分が回答済みのものを除外して SurveyWithStats[] にする（一覧表示の共通処理）。
   * 回答済み判定・回答数・作成者プロフィール・プレビュー・設問タイプはそれぞれ
   * 1クエリで一括取得する（N+1対策）。
   */
  private async decorateSurveys(userId: string, surveys: Survey[]): Promise<SurveyWithStats[]> {
    const ids = surveys.map((s) => s.id);
    const [respondedIds, counts, authors, previews, questionTypes] = await Promise.all([
      this.responseRepo.findRespondedSurveyIds(userId, ids),
      this.surveyRepo.countResponsesBySurveyIds(ids),
      this.profileRepo.findByIds(surveys.map((s) => s.user_id)),
      this.surveyRepo.findPreviewQuestionsBySurveyIds(ids),
      this.surveyRepo.findQuestionTypesBySurveyIds(ids),
    ]);
    return surveys
      .filter((s) => !respondedIds.has(s.id))
      .map((s) => {
        // 全問回答で得られるポイントの目安。平均品質（×1.0）＝設問コスト合計（最低1）、
        // 最高は×1.5。DB側（submit_survey_response）と同じ計算式。
        const base = Math.max(
          1,
          Math.ceil(
            (questionTypes.get(s.id) ?? []).reduce(
              (sum, t) => sum + QuestionTypeRegistry.get(t).pointCost,
              0
            )
          )
        );
        return {
          ...s,
          response_count: counts.get(s.id) ?? 0,
          author_id: s.user_id,
          author_nickname: authors.get(s.user_id)?.nickname ?? '不明',
          author_avatar_url: authors.get(s.user_id)?.avatar_url ?? null,
          preview: previews.get(s.id) ?? [],
          avg_reward_points: base,
          max_reward_points: Math.ceil(base * 1.5),
        };
      });
  }

  /**
   * 回答可能なアンケート一覧（おすすめ）：
   * 公開中 / 自分が作成したもの除外 / 回答済み除外 /
   * 属性マッチング（target_conditions）と最低信頼スコア（min_trust_score）を満たすもののみ。
   */
  async listAnswerableSurveys(userId: string): Promise<SurveyWithStats[]> {
    const me = await this.profileRepo.findById(userId);
    const surveys = (await this.surveyRepo.findOpenSurveys()).filter(
      (s) =>
        s.user_id !== userId &&
        // 限定公開（unlisted）は一覧に出さない（共有リンクを知っている人のみ）
        s.visibility !== 'unlisted' &&
        // 属性マッチング配信：条件を満たす回答者にのみ表示する
        (!me || matches(me, s.target_conditions)) &&
        // 高信頼フィルター：信頼スコアが基準未満の回答者には配信しない
        (s.min_trust_score == null || (me?.trust_score ?? 0) >= s.min_trust_score)
    );
    return this.decorateSurveys(userId, surveys);
  }

  /**
   * 新着アンケート一覧：属性マッチング・信頼スコア条件を問わず、
   * 公開中・公開設定・自分以外・未回答のものを新着順に返す（発見性を優先する行）。
   */
  async listNewest(userId: string, limit = 10): Promise<SurveyWithStats[]> {
    const surveys = (await this.surveyRepo.findOpenSurveys()).filter(
      (s) => s.user_id !== userId && s.visibility !== 'unlisted'
    );
    return (await this.decorateSurveys(userId, surveys)).slice(0, limit);
  }

  /** フォロー中ユーザーが新たに公開したアンケート（新着順、最大 limit 件）。 */
  async listByFollowedUsers(userId: string, limit = 10): Promise<SurveyWithStats[]> {
    const followedIds = await this.followRepo.listFollowedUserIds(userId);
    if (followedIds.length === 0) return [];
    const surveys = await this.surveyRepo.findByUserIds(followedIds);
    return (await this.decorateSurveys(userId, surveys)).slice(0, limit);
  }
}
