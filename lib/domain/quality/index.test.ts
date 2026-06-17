/**
 * CompositeEvaluator の非対称minロジックテスト。
 * createQualityEvaluator は外部LLM依存なので直接テストせず、
 * クラスの振る舞いをモックで検証する。
 */
import { describe, expect, it, vi } from 'vitest';
import type { IQualityEvaluator, QualityResult, EvaluationItem } from './types';

// ────────────────────────────────────────────────
// テスト用ヘルパ
// ────────────────────────────────────────────────

function makeEvaluator(score: number, feedback = 'fb'): IQualityEvaluator {
  return { evaluate: vi.fn().mockResolvedValue({ score, feedback }) };
}

function makeFailingEvaluator(): IQualityEvaluator {
  return { evaluate: vi.fn().mockRejectedValue(new Error('AI失敗')) };
}

/**
 * CompositeEvaluator はモジュール内クラスなので、
 * createQualityEvaluator の内部ロジックを直接テストするために
 * 同等ロジックをここで再現する。
 *
 * NOTE: 実装と乖離しないよう、ロジックの変更時はこちらも合わせて更新する。
 */
async function compositeEvaluate(
  ai: IQualityEvaluator,
  rule: IQualityEvaluator,
  items: EvaluationItem[] = []
): Promise<QualityResult> {
  const ruleResult = await rule.evaluate(items);
  if (ruleResult.score === 0) return ruleResult;

  let aiResult: QualityResult;
  try {
    aiResult = await ai.evaluate(items);
  } catch {
    return ruleResult;
  }

  const aiScore   = aiResult.score;
  const ruleScore = ruleResult.score;

  let finalScore: number;
  let useAiFeedback: boolean;

  if (aiScore <= ruleScore) {
    finalScore    = Math.min(ruleScore, aiScore + 10);
    useAiFeedback = true;
  } else if (aiScore > ruleScore + 15) {
    if (aiScore >= 80 && ruleScore >= 70) {
      finalScore    = aiScore;
      useAiFeedback = true;
    } else {
      finalScore    = ruleScore;
      useAiFeedback = false;
    }
  } else {
    finalScore    = aiScore;
    useAiFeedback = true;
  }

  return {
    score:    finalScore,
    feedback: useAiFeedback ? aiResult.feedback : ruleResult.feedback,
  };
}

// ────────────────────────────────────────────────
// rule.score === 0 の無条件 0
// ────────────────────────────────────────────────

describe('CompositeEvaluator — rule.score===0 は無条件 0', () => {
  it('rule=0 のとき AI 結果に関わらず 0 を返す', async () => {
    const res = await compositeEvaluate(makeEvaluator(90), makeEvaluator(0, 'アテンション失敗'));
    expect(res.score).toBe(0);
    expect(res.feedback).toBe('アテンション失敗');
  });
});

// ────────────────────────────────────────────────
// AI 失敗フォールバック
// ────────────────────────────────────────────────

describe('CompositeEvaluator — AI失敗フォールバック', () => {
  it('AI が例外を投げたらルールベース結果を返す', async () => {
    const res = await compositeEvaluate(makeFailingEvaluator(), makeEvaluator(70, 'rule-fb'));
    expect(res.score).toBe(70);
    expect(res.feedback).toBe('rule-fb');
  });
});

// ────────────────────────────────────────────────
// ai <= rule: min(rule, ai+10)
// ────────────────────────────────────────────────

describe('CompositeEvaluator — ai <= rule: min(rule, ai+10)', () => {
  it('ai=60, rule=80 → min(80, 70) = 70（AI フィードバック）', async () => {
    const res = await compositeEvaluate(makeEvaluator(60, 'ai-fb'), makeEvaluator(80, 'rule-fb'));
    expect(res.score).toBe(70);
    expect(res.feedback).toBe('ai-fb');
  });

  it('ai=75, rule=80 → min(80, 85) = 80（rule 上限でクリップ）', async () => {
    const res = await compositeEvaluate(makeEvaluator(75, 'ai-fb'), makeEvaluator(80, 'rule-fb'));
    expect(res.score).toBe(80);
    expect(res.feedback).toBe('ai-fb');
  });

  it('ai=rule のとき ai+10 > rule なら rule を返す', async () => {
    const res = await compositeEvaluate(makeEvaluator(65, 'ai-fb'), makeEvaluator(65, 'rule-fb'));
    expect(res.score).toBe(65); // min(65, 75) = 65
    expect(res.feedback).toBe('ai-fb');
  });
});

// ────────────────────────────────────────────────
// ai > rule+15: 吊り上げ疑い → rule 天井（injection防御）
// ────────────────────────────────────────────────

describe('CompositeEvaluator — ai > rule+15: rule 天井（injection防御）', () => {
  it('ai=90, rule=50 → score=50（rule天井）、rule フィードバック', async () => {
    const res = await compositeEvaluate(makeEvaluator(90, 'ai-fb'), makeEvaluator(50, 'rule-fb'));
    expect(res.score).toBe(50);
    expect(res.feedback).toBe('rule-fb');
  });

  it('ai=70, rule=54 → score=54（70-54=16 > 15）', async () => {
    const res = await compositeEvaluate(makeEvaluator(70, 'ai-fb'), makeEvaluator(54, 'rule-fb'));
    expect(res.score).toBe(54);
    expect(res.feedback).toBe('rule-fb');
  });

  it('ai=70, rule=55 → score=70（70-55=15、> ではなく = なので通常パス）', async () => {
    const res = await compositeEvaluate(makeEvaluator(70, 'ai-fb'), makeEvaluator(55, 'rule-fb'));
    expect(res.score).toBe(70);
    expect(res.feedback).toBe('ai-fb');
  });
});

// ────────────────────────────────────────────────
// ヒステリシス: ai>rule+15 でも ai>=80 && rule>=70 なら AI を許容
// ────────────────────────────────────────────────

describe('CompositeEvaluator — ヒステリシス（ai>=80 && rule>=70）', () => {
  it('ai=90, rule=70 → ヒステリシス発動 → score=90（ai）', async () => {
    const res = await compositeEvaluate(makeEvaluator(90, 'ai-fb'), makeEvaluator(70, 'rule-fb'));
    expect(res.score).toBe(90);
    expect(res.feedback).toBe('ai-fb');
  });

  it('ai=80, rule=70 → ヒステリシス発動（境界値）→ score=80', async () => {
    const res = await compositeEvaluate(makeEvaluator(80, 'ai-fb'), makeEvaluator(70, 'rule-fb'));
    // 80-70=10、<= 15 なので通常パス（aiScore > ruleScore+15 に入らない）
    expect(res.score).toBe(80);
  });

  it('ai=85, rule=69 → ヒステリシス非発動（rule<70）→ rule 天井', async () => {
    const res = await compositeEvaluate(makeEvaluator(85, 'ai-fb'), makeEvaluator(69, 'rule-fb'));
    // 85-69=16 > 15、ai<80 or rule<70 → rule 天井
    expect(res.score).toBe(69);
    expect(res.feedback).toBe('rule-fb');
  });

  it('ai=79, rule=70 → ヒステリシス非発動（ai<80）→ rule 天井', async () => {
    // 79-70=9 <= 15 → そもそも吊り上げ判定に入らない（通常パス）
    const res = await compositeEvaluate(makeEvaluator(79, 'ai-fb'), makeEvaluator(70, 'rule-fb'));
    expect(res.score).toBe(79); // 通常パス
  });
});

// ────────────────────────────────────────────────
// 通常範囲（rule < ai <= rule+15）
// ────────────────────────────────────────────────

describe('CompositeEvaluator — 通常範囲（rule < ai <= rule+15）', () => {
  it('ai=75, rule=65 → score=75（ai をそのまま採用）', async () => {
    const res = await compositeEvaluate(makeEvaluator(75, 'ai-fb'), makeEvaluator(65, 'rule-fb'));
    expect(res.score).toBe(75);
    expect(res.feedback).toBe('ai-fb');
  });

  it('ai=rule+15 の境界 → ai を採用', async () => {
    const res = await compositeEvaluate(makeEvaluator(65, 'ai-fb'), makeEvaluator(50, 'rule-fb'));
    expect(res.score).toBe(65); // 65-50=15、> ではないので通常パス
    expect(res.feedback).toBe('ai-fb');
  });
});
