import type { QuestionWithOptions } from '@/lib/types/database';

/**
 * 条件付き表示（分岐）の評価。
 *
 * 設問の condition が満たされているかを判定し、「実際に表示される設問」の id 集合を返す。
 * クライアント（回答フォーム）とサーバー（回答バリデーション）の両方から呼び、
 * 表示・必須判定を一致させる。
 *
 * @param questions  設問一覧（order_index 昇順を想定。順不同でも内部でソートする）
 * @param selectedOptionTexts  設問id → その設問で選択済みの選択肢テキスト一覧
 */
export function computeVisibleQuestionIds(
  questions: QuestionWithOptions[],
  selectedOptionTexts: (questionId: string) => string[]
): Set<string> {
  const ordered = [...questions].sort((a, b) => a.order_index - b.order_index);
  const byOrder = new Map(ordered.map((q) => [q.order_index, q]));
  const visible = new Set<string>();

  for (const q of ordered) {
    const cond = q.condition;
    if (!cond) {
      visible.add(q.id);
      continue;
    }
    const source = byOrder.get(cond.sourceQuestionOrder);
    // 条件元が存在し、かつ表示されていて、必要な選択肢が選ばれていれば表示
    const condTexts = cond.optionTexts ?? (cond.optionText ? [cond.optionText] : []);
    if (
      source &&
      visible.has(source.id) &&
      condTexts.some((t) => selectedOptionTexts(source.id).includes(t))
    ) {
      visible.add(q.id);
    }
  }
  return visible;
}
