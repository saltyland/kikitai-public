import type { EvaluationItem, IQualityEvaluator, QualityResult } from './types';

/**
 * ルールベースの品質評価器（DESIGN_SPEC §2）。
 * 外部APIに依存せず常に動作するフォールバック実装。
 *
 * ルール:
 *  1. アテンションチェック（正解指定のある設問）に不正解 → 即座にスコア0
 *  2. 短すぎるテキスト回答（10文字未満） → -20点
 *  3. 数値スケールの一直線回答（全問同じ値） → -15点
 */
export class RuleBasedEvaluator implements IQualityEvaluator {
  async evaluate(items: EvaluationItem[]): Promise<QualityResult> {
    let score = 100;
    const reasons: string[] = [];

    // 1. アテンションチェック
    for (const item of items) {
      if (!item.correctOptionText) continue;
      const selectedTexts = (item.answer?.option_ids ?? []).map((id) =>
        item.question.options.find((o) => o.id === id)?.text ?? ''
      );
      const passed = selectedTexts.includes(item.correctOptionText);
      if (!passed) {
        return {
          score: 0,
          feedback:
            'アテンションチェック設問への回答が確認できませんでした。設問をよく読んでの回答にご協力ください。',
        };
      }
    }

    // 2. 短すぎるテキスト回答
    const textItems = items.filter(
      (i) => i.question.type === 'text' || i.question.type === 'paragraph'
    );
    const shortAnswers = textItems.filter((i) => {
      const t = (i.answer?.text_answer ?? '').trim();
      return t.length > 0 && t.length < 10;
    });
    if (shortAnswers.length > 0) {
      score -= 20;
      reasons.push('自由記述の回答が短く、内容の充実度に改善の余地があります。');
    }

    // 3. スケール設問の一直線回答（全問同じ値）
    const scaleItems = items.filter((i) => i.question.type === 'scale');
    if (scaleItems.length >= 3) {
      const values = scaleItems.map((i) => (i.answer?.option_ids ?? [])[0] ?? '');
      const answered = values.filter((v) => v !== '');
      if (answered.length === scaleItems.length && new Set(answered).size === 1) {
        score -= 15;
        reasons.push('段階評価がすべて同じ値で、回答の一貫性に注意が必要です。');
      }
    }

    score = Math.max(0, Math.min(100, score));
    const feedback =
      reasons.length === 0
        ? '丁寧に回答いただきありがとうございました。問題は見つかりませんでした。'
        : reasons.join(' ');
    return { score, feedback };
  }
}
