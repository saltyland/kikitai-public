import type { SupabaseClient } from '@supabase/supabase-js';
import { SurveyRepository } from '@/lib/repositories/surveyRepository';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { ResponseRepository } from '@/lib/repositories/responseRepository';
import type {
  Survey,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
  SurveyWithStats,
  QuestionInput,
} from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';

/** アンケート作成・編集・一覧・状態管理のビジネスロジック */
export class SurveyService {
  private readonly surveyRepo: SurveyRepository;
  private readonly profileRepo: ProfileRepository;
  private readonly responseRepo: ResponseRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.surveyRepo = new SurveyRepository(supabase);
    this.profileRepo = new ProfileRepository(supabase);
    this.responseRepo = new ResponseRepository(supabase);
  }

  /** 入力バリデーション。設問タイプ固有の検証はレジストリ経由で各タイプ定義に委譲する。 */
  private validate(input: SurveyInput): void {
    if (!input.title.trim()) throw new Error('タイトルは必須です');
    if (input.required_count < 1) throw new Error('必要回答数は1以上にしてください');
    if (input.questions.length === 0) throw new Error('設問を1つ以上追加してください');
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
   * アンケート公開に必要なポイントコストを試算する。
   * 要件定義v2.0のコスト表（設問タイプ別単価）に基づく。
   * Phase 4のポイントシステムで公開時に消費する。現時点では参照用。
   */
  estimateCost(input: SurveyInput): number {
    return input.questions.reduce(
      (sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost,
      0
    );
  }

  /** セクション（ページ）メタ情報を正規化する */
  private sanitizeSections(input: SurveyInput) {
    return (input.sections ?? []).map((s) => ({
      title: (s.title ?? '').trim(),
      description: (s.description ?? '').trim(),
    }));
  }

  /** 新規作成 */
  async createSurvey(userId: string, input: SurveyInput): Promise<Survey> {
    this.validate(input);
    const survey = await this.surveyRepo.insertSurvey({
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      required_count: input.required_count,
      deadline: input.deadline || null,
      status: input.status,
      sections: this.sanitizeSections(input),
    });
    await this.surveyRepo.replaceQuestions(survey.id, this.toQuestionRows(input.questions));
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

    const survey = await this.surveyRepo.updateSurvey(surveyId, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      required_count: input.required_count,
      deadline: input.deadline || null,
      status: input.status,
      sections: this.sanitizeSections(input),
    });
    await this.surveyRepo.replaceQuestions(surveyId, this.toQuestionRows(input.questions));
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
    await this.surveyRepo.updateStatus(surveyId, status);
  }

  async deleteSurvey(userId: string, surveyId: string): Promise<void> {
    const existing = await this.surveyRepo.findById(surveyId);
    if (!existing) throw new Error('アンケートが見つかりません');
    if (existing.user_id !== userId) throw new Error('削除権限がありません');
    await this.surveyRepo.delete(surveyId);
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
   * 回答可能なアンケート一覧：
   * 公開中 / 自分が作成したもの除外 / 回答済み除外
   * 回答済み判定・回答数・作成者プロフィールはそれぞれ1クエリで一括取得する（N+1対策）。
   */
  async listAnswerableSurveys(userId: string): Promise<SurveyWithStats[]> {
    const surveys = (await this.surveyRepo.findOpenSurveys()).filter(
      (s) => s.user_id !== userId
    );
    const ids = surveys.map((s) => s.id);
    const [respondedIds, counts, authors] = await Promise.all([
      this.responseRepo.findRespondedSurveyIds(userId, ids),
      this.surveyRepo.countResponsesBySurveyIds(ids),
      this.profileRepo.findByIds(surveys.map((s) => s.user_id)),
    ]);
    return surveys
      .filter((s) => !respondedIds.has(s.id))
      .map((s) => ({
        ...s,
        response_count: counts.get(s.id) ?? 0,
        author_nickname: authors.get(s.user_id)?.nickname ?? '不明',
      }));
  }
}
