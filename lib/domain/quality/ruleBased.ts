import type {
  EvaluationContext,
  EvaluationItem,
  IQualityEvaluator,
  QualityResult,
} from './types';

/** 1設問あたりこの秒数を下回るペースの回答は「速すぎる」とみなす */
const MIN_SECONDS_PER_QUESTION = 2;
/** 速すぎる回答の減点 */
const TOO_FAST_PENALTY = 30;
/** 選択式の直線回答（全問同じ位置の選択肢）を判定する最低設問数 */
const STRAIGHT_LINE_MIN_QUESTIONS = 5;

/**
 * ルールベースの品質評価器（DESIGN_SPEC §2）。
 * 外部APIに依存せず常に動作するフォールバック実装。
 *
 * ルール:
 *  1. アテンションチェック（正解指定のある設問）に不正解 → 即座にスコア0
 *  2. 短すぎるテキスト回答（10文字未満） → -20点
 *  3. 数値スケールの一直線回答（全問同じ値） → -15点
 *  4. 回答時間が短すぎる（設問数×2秒未満） → -30点
 *  5. 選択式設問5問以上で全問同じ位置の選択肢 → -15点
 */
export class RuleBasedEvaluator implements IQualityEvaluator {
  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
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

    // 4. 回答時間が短すぎる（雑な「とりあえず埋めるだけ」検出）
    const durationSec = context?.durationSec;
    if (durationSec !== undefined && durationSec >= 0) {
      const minDuration = items.length * MIN_SECONDS_PER_QUESTION;
      if (durationSec < minDuration) {
        score -= TOO_FAST_PENALTY;
        reasons.push('回答時間が極端に短く、設問を十分に読まずに回答した可能性があります。');
      }
    }

    // 5. 選択式の直線回答：全問で同じ位置（order_index）の選択肢を選んでいる
    const positionItems = items.filter(
      (i) =>
        ['single', 'dropdown', 'scale', 'attention'].includes(i.question.type) &&
        (i.answer?.option_ids?.length ?? 0) === 1
    );
    if (positionItems.length >= STRAIGHT_LINE_MIN_QUESTIONS) {
      const positions = positionItems.map((i) => {
        const id = (i.answer?.option_ids ?? [])[0];
        return i.question.options.find((o) => o.id === id)?.order_index ?? -1;
      });
      if (positions.every((p) => p >= 0 && p === positions[0])) {
        score -= 15;
        reasons.push('選択式の回答がすべて同じ位置に並んでおり、機械的な回答の可能性があります。');
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
