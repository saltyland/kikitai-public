import { describe, expect, it } from 'vitest';
import { grade } from './grade';

// ────────────────────────────────────────────────
// ヘルパ
// ────────────────────────────────────────────────

/**
 * finalRisk を直接指定するショートカット。
 * grade({ mechScore: 0, llmRisk: r }) → finalRisk = 1-(1-0)(1-r) = r（救済なし）。
 * ただし mechScore=0 < 0.15 のため finalRisk≥0.80 では安全弁が発動し L1c 止まりになる。
 * T0 の境界テストには直接 mechScore を指定する。
 */
function byRisk(r: number) {
  return grade({ mechScore: 0, llmRisk: r });
}

// ────────────────────────────────────────────────
// ティア境界テスト
// ────────────────────────────────────────────────

describe('grade() — ティア境界', () => {
  it('PASS: finalRisk < 0.30', () => {
    const res = byRisk(0.29);
    expect(res.tier).toBe('PASS');
    expect(res.payoutRate).toBe(1.0);
  });

  it('PASS/L1a 境界ちょうど(0.30)は L1a', () => {
    const res = byRisk(0.30);
    expect(res.tier).toBe('L1a');
    expect(res.payoutRate).toBe(0.8);
  });

  it('L1a: 0.30 ≤ finalRisk < 0.50', () => {
    const res = byRisk(0.40);
    expect(res.tier).toBe('L1a');
    expect(res.payoutRate).toBe(0.8);
  });

  it('L1a/L1b 境界ちょうど(0.50)は L1b', () => {
    const res = byRisk(0.50);
    expect(res.tier).toBe('L1b');
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1b: 0.50 ≤ finalRisk < 0.65', () => {
    const res = byRisk(0.57);
    expect(res.tier).toBe('L1b');
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1b/L1c 境界ちょうど(0.65)は L1c', () => {
    const res = byRisk(0.65);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('L1c: 0.65 ≤ finalRisk < 0.80', () => {
    const res = byRisk(0.72);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('T0 境界ちょうど(0.80)は T0（mechScore が十分高い場合）', () => {
    // 1-(1-0.50)(1-0.60) = 1-0.20 = 0.80, mechScore=0.50 >= 0.15 → T0
    const res = grade({ mechScore: 0.50, llmRisk: 0.60 });
    expect(res.finalRisk).toBeCloseTo(0.80);
    expect(res.tier).toBe('T0');
    expect(res.payoutRate).toBe(0);
  });

  it('T0: finalRisk ≥ 0.80 かつ mechScore ≥ 0.15', () => {
    // 1-(1-0.80)(1-0.80) = 1-0.04 = 0.96
    const res = grade({ mechScore: 0.80, llmRisk: 0.80 });
    expect(res.tier).toBe('T0');
    expect(res.payoutRate).toBe(0);
  });

  it('finalRisk=1.0（上端）でも T0', () => {
    const res = grade({ mechScore: 1.0, llmRisk: 1.0 });
    expect(res.tier).toBe('T0');
    expect(res.payoutRate).toBe(0);
  });

  it('finalRisk=0.0（下端）は PASS', () => {
    const res = grade({ mechScore: 0.0, llmRisk: 0.0 });
    expect(res.tier).toBe('PASS');
    expect(res.payoutRate).toBe(1.0);
  });
});

// ────────────────────────────────────────────────
// LLM 単独 T0 防止（安全弁）
// ────────────────────────────────────────────────

describe('grade() — LLM 単独 T0 防止（mechScore < 0.15）', () => {
  it('mechScore=0.10 + llmRisk=0.90 → finalRisk=0.91 ≥ 0.80 でも L1c 止まり', () => {
    // 1-(0.90)(0.10) = 1-0.09 = 0.91, mechScore=0.10 < 0.15 → 安全弁発動
    const res = grade({ mechScore: 0.10, llmRisk: 0.90 });
    expect(res.finalRisk).toBeCloseTo(0.91);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('mechScore=0.0, llmRisk=1.0 → finalRisk=1.0 でも L1c（T0 ではない）', () => {
    const res = grade({ mechScore: 0.0, llmRisk: 1.0 });
    expect(res.finalRisk).toBeCloseTo(1.0);
    expect(res.tier).toBe('L1c');
  });

  it('mechScore=0.14（< 0.15, ギリギリ）+ llmRisk=1.0 → L1c 止まり', () => {
    // 1-(0.86)(0.0) = ... 1-(0.86)(0) = 1, mechScore=0.14 < 0.15 → L1c
    const res = grade({ mechScore: 0.14, llmRisk: 1.0 });
    expect(res.tier).toBe('L1c');
  });

  it('mechScore=0.15（= 閾値）かつ finalRisk≥0.80 → T0 になりうる', () => {
    // 1-(1-0.15)(1-1.0) = 1-(0.85)(0) = 1.0, mechScore=0.15 >= 0.15 → T0
    const res = grade({ mechScore: 0.15, llmRisk: 1.0 });
    expect(res.finalRisk).toBeCloseTo(1.0);
    expect(res.tier).toBe('T0');
  });
});

// ────────────────────────────────────────────────
// 確率合成の計算確認
// ────────────────────────────────────────────────

describe('grade() — 確率合成 finalRisk', () => {
  it('mech=0.5, llm=0.5 → finalRisk = 1-(0.5)(0.5) = 0.75', () => {
    const res = grade({ mechScore: 0.5, llmRisk: 0.5 });
    expect(res.finalRisk).toBeCloseTo(0.75);
    expect(res.tier).toBe('L1c'); // 0.65 ≤ 0.75 < 0.80
  });

  it('mech=0, llm=r → finalRisk = r（単純一変数）', () => {
    const r = 0.42;
    const res = grade({ mechScore: 0, llmRisk: r });
    expect(res.finalRisk).toBeCloseTo(r);
  });

  it('mech=r, llm=0 → finalRisk = r（単純一変数）', () => {
    const r = 0.35;
    const res = grade({ mechScore: r, llmRisk: 0 });
    expect(res.finalRisk).toBeCloseTo(r);
  });
});

// ────────────────────────────────────────────────
// 救済（rescue）
// ────────────────────────────────────────────────

describe('grade() — 救済（rescue）', () => {
  it('trust=80 で救済が発生し finalRisk が下がる', () => {
    const withoutRescue = grade({ mechScore: 0.50, llmRisk: 0.50 });
    const withRescue    = grade({ mechScore: 0.50, llmRisk: 0.50, trust: 80 });
    expect(withRescue.finalRisk).toBeLessThan(withoutRescue.finalRisk);
  });

  it('trust=79 では高信頼救済は発動しない', () => {
    const withoutTrust = grade({ mechScore: 0.50, llmRisk: 0.50 });
    const withLowTrust = grade({ mechScore: 0.50, llmRisk: 0.50, trust: 79 });
    expect(withLowTrust.finalRisk).toBeCloseTo(withoutTrust.finalRisk);
  });

  it('short_answer_ok hint で救済が発生する', () => {
    const without = grade({ mechScore: 0.50, llmRisk: 0.50 });
    const withHint = grade({ mechScore: 0.50, llmRisk: 0.50, hints: ['short_answer_ok'] });
    expect(withHint.finalRisk).toBeLessThan(without.finalRisk);
  });

  it('paste_justified hint で救済が発生する', () => {
    const without = grade({ mechScore: 0.50, llmRisk: 0.50 });
    const withHint = grade({ mechScore: 0.50, llmRisk: 0.50, hints: ['paste_justified'] });
    expect(withHint.finalRisk).toBeLessThan(without.finalRisk);
  });

  it('全救済条件重複でも上限 0.12 を超えない', () => {
    // raw = 1-(0.5)(0.5) = 0.75, rescue_max = 0.12 → finalRisk >= 0.63
    const res = grade({
      mechScore: 0.50,
      llmRisk:   0.50,
      trust:     90,
      hints:     ['short_answer_ok', 'paste_justified'],
    });
    expect(res.finalRisk).toBeGreaterThanOrEqual(0.63);
    expect(res.finalRisk).toBeCloseTo(0.75 - 0.12);
  });

  it('救済で L1c → L1b への1段降格が起きる', () => {
    // raw = 1-(1-0.30)(1-0.52) = 1-(0.70)(0.48) = 1-0.336 = 0.664 → L1c
    const without = grade({ mechScore: 0.30, llmRisk: 0.52 });
    expect(without.tier).toBe('L1c');

    // 高信頼救済: 0.664 - 0.08 = 0.584 → L1b
    const withRescue = grade({ mechScore: 0.30, llmRisk: 0.52, trust: 85 });
    expect(withRescue.tier).toBe('L1b');
  });
});

// ────────────────────────────────────────────────
// クランプ
// ────────────────────────────────────────────────

describe('grade() — クランプ', () => {
  it('finalRisk は 0 未満にならない（過大な救済があっても）', () => {
    const res = grade({
      mechScore: 0.0,
      llmRisk:   0.0,
      trust:     100,
      hints:     ['short_answer_ok', 'paste_justified'],
    });
    expect(res.finalRisk).toBeGreaterThanOrEqual(0);
  });

  it('finalRisk は 1 を超えない（mechScore=1, llmRisk=1 でも）', () => {
    const res = grade({ mechScore: 1.0, llmRisk: 1.0 });
    expect(res.finalRisk).toBeLessThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────
// 付与率の確認
// ────────────────────────────────────────────────

describe('grade() — 付与率テーブル（5段）', () => {
  it('PASS → payoutRate=1.0', () => {
    expect(grade({ mechScore: 0.1, llmRisk: 0.1 }).payoutRate).toBe(1.0);
  });

  it('L1a → payoutRate=0.8', () => {
    const res = byRisk(0.40);
    expect(res.payoutRate).toBe(0.8);
  });

  it('L1b → payoutRate=0.5', () => {
    const res = byRisk(0.55);
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1c → payoutRate=0.3', () => {
    const res = byRisk(0.72);
    expect(res.payoutRate).toBe(0.3);
  });

  it('T0 → payoutRate=0', () => {
    const res = grade({ mechScore: 0.80, llmRisk: 0.80 });
    expect(res.payoutRate).toBe(0);
  });
});
