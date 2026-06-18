import type { EvaluationItem, MechSignals, RoutingDecision } from './types';

/**
 * ルーティングが参照するユーザー文脈（設計書 §3）。
 * 現状は判定に未使用だが、将来の信頼スコア連動（低信頼ユーザーは積極的にLLM精査）
 * の受け皿として引数に取る。
 */
export interface RoutingUser {
  /** 信頼スコア 0〜100（将来の連動用・任意） */
  trustScore?: number;
}

/** 自由記述として回答が入力されている設問か（text/paragraph かつ非空） */
function isAnsweredFreeText(item: EvaluationItem): boolean {
  const t = item.question.type;
  if (t !== 'text' && t !== 'paragraph') return false;
  return (item.answer?.text_answer ?? '').trim().length > 0;
}

function decision(callLLM: boolean, reason: string): RoutingDecision {
  return { callLLM, reason };
}

/**
 * LLM 評価を呼ぶべきか判定する（設計書 §3・外部依存なしの純ロジック）。
 *
 * 判定順（早い者勝ち）:
 *  (a) T0確定（ルールベースで即0＝アテンション誤答等）→ LLMを呼んでも結論は変わらない → false
 *  (b) 不正シグナルのヒント（paste / aiStyle / inputDynamics）→ LLMで精査 → true
 *  (c) 自由記述が無い（選択式のみ）→ 機械評価で十分 → false
 *  (d) 全て短答可（長文paragraphを含まない）かつ機械PASS → false
 *  (e) 自由記述あり＆グレー（PASSでない or 長文を含む）→ LLMで内容評価 → true
 */
export function shouldCallLLM(
  items: EvaluationItem[],
  mech: MechSignals,
  user?: RoutingUser
): RoutingDecision {
  // user は現状の判定には用いないが、将来の信頼スコア連動の受け皿として受け取る。
  void user;

  // (a) T0確定：ルールベースで即0。LLMを呼んでも無効判定は覆らない。
  if (mech.ruleScore === 0) {
    return decision(false, 'T0確定（ルールベースで無効）');
  }

  // (b) 不正シグナルのヒント → LLMで精査
  const hints = mech.hints ?? {};
  if (hints.paste || hints.aiStyle || hints.inputDynamics) {
    return decision(true, '不正シグナル検出（paste/aiStyle/inputDynamics）');
  }

  // (c) 自由記述なし → 選択式は機械評価で十分
  const freeText = items.filter(isAnsweredFreeText);
  if (freeText.length === 0) {
    return decision(false, '自由記述なし（機械評価で確定）');
  }

  // (d) 全て短答可（長文 paragraph を含まない）かつ機械PASS → LLM不要
  const hasLongForm = freeText.some((i) => i.question.type === 'paragraph');
  if (!hasLongForm && mech.rulePass) {
    return decision(false, '短答のみ＆機械評価PASS');
  }

  // (e) 自由記述あり＆グレー（PASSでない or 長文を含む）→ LLMで内容評価
  return decision(true, '自由記述ありのグレー回答（LLMで内容評価）');
}
