import { describe, expect, it } from 'vitest';
import { grade } from './grade';

// ────────────────────────────────────────────────
// ヘルパ
// ────────────────────────────────────────────────

/** final_risk を直接指定するショートカット（w_m=w_l=0.5、救済なし） */
function byRisk(r: number) {
  return grade({ mechScore: r, llmRisk: r });
}

// ────────────────────────────────────────────────
// ティア境界テスト
// ────────────────────────────────────────────────

describe('grade() — ティア境界', () => {
  it('PASS: finalRisk < 0.35', () => {
    const res = byRisk(0.34);
    expect(res.tier).toBe('PASS');
    expect(res.payoutRate).toBe(1.0);
  });

  it('PASS/L1a 境界ちょうど(0.35)は L1a', () => {
    const res = byRisk(0.35);
    expect(res.tier).toBe('L1a');
    expect(res.payoutRate).toBe(0.8);
  });

  it('L1a: 0.35 ≤ finalRisk < 0.47', () => {
    const res = byRisk(0.40);
    expect(res.tier).toBe('L1a');
    expect(res.payoutRate).toBe(0.8);
  });

  it('L1a/L1b 境界ちょうど(0.47)は L1b', () => {
    const res = byRisk(0.47);
    expect(res.tier).toBe('L1b');
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1b: 0.47 ≤ finalRisk < 0.58', () => {
    const res = byRisk(0.52);
    expect(res.tier).toBe('L1b');
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1b/L1c 境界ちょうど(0.58)は L1c', () => {
    const res = byRisk(0.58);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('L1c: 0.58 ≤ finalRisk < 0.70', () => {
    const res = byRisk(0.65);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('T0 境界ちょうど(0.70)は T0（mechScore も高い場合）', () => {
    const res = grade({ mechScore: 0.70, llmRisk: 0.70 });
    expect(res.tier).toBe('T0');
    expect(res.payoutRate).toBe(0);
  });

  it('T0: finalRisk ≥ 0.70 かつ mechScore ≥ 0.35', () => {
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

describe('grade() — LLM 単独 T0 防止', () => {
  it('mechScore < 0.35（PASS 圏）のとき finalRisk ≥ 0.70 でも T0 にならない', () => {
    // mechScore=0.0, llmRisk=1.0 → finalRisk = 0.5*0 + 0.5*1.0 = 0.50
    // これは T0 に届かないが、mechScore=0.20 + llmRisk=1.0 のケースを試す
    const res = grade({ mechScore: 0.20, llmRisk: 1.0 });
    // finalRisk = 0.5*0.20 + 0.5*1.0 = 0.10 + 0.50 = 0.60 → L1c だが T0 ではない
    expect(res.tier).not.toBe('T0');
  });

  it('mechScore=0.0, llmRisk=1.0 → finalRisk=0.50 → L1b（T0 ではない）', () => {
    const res = grade({ mechScore: 0.0, llmRisk: 1.0 });
    expect(res.finalRisk).toBeCloseTo(0.5);
    expect(res.tier).toBe('L1b');
  });

  it('mechScore=0.30（< 0.35）+ llmRisk=1.0 → finalRisk=0.65 → L1c（T0 ではない）', () => {
    const res = grade({ mechScore: 0.30, llmRisk: 1.0 });
    expect(res.finalRisk).toBeCloseTo(0.65);
    expect(res.tier).toBe('L1c');
    expect(res.payoutRate).toBe(0.3);
  });

  it('mechScore=0.34（< 0.35, ギリギリ PASS 圏）でも finalRisk≥0.70 なら L1c 止まり', () => {
    // mechScore=0.34, llmRisk=1.0 → finalRisk = 0.5*0.34 + 0.5*1.0 = 0.17+0.50 = 0.67 < 0.70
    // 0.67 は L1c なので安全弁は不要だが、安全弁が干渉しないことを確認
    const res = grade({ mechScore: 0.34, llmRisk: 1.0 });
    expect(res.tier).toBe('L1c');
  });

  it('mechScore=0.35（= θ_soft, PASS 圏外）かつ finalRisk≥0.70 → T0 になりうる', () => {
    // mechScore=0.35, llmRisk=1.0 → finalRisk=0.675 < 0.70 なので T0 にならない
    // mechScore=0.50, llmRisk=0.90 → finalRisk=0.5*0.50+0.5*0.90=0.70 → T0
    const res = grade({ mechScore: 0.50, llmRisk: 0.90 });
    expect(res.finalRisk).toBeCloseTo(0.70);
    expect(res.tier).toBe('T0');
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
    const res = grade({
      mechScore: 0.50,
      llmRisk: 0.50,
      trust: 90,
      hints: ['short_answer_ok', 'paste_justified'],
    });
    // raw = 0.5*0.5 + 0.5*0.5 = 0.50。救済上限=0.12 → finalRisk ≥ 0.50-0.12 = 0.38
    expect(res.finalRisk).toBeGreaterThanOrEqual(0.38);
  });

  it('救済で L1c → L1b への1段降格が起きる', () => {
    // 救済なし: mechScore=0.70, llmRisk=0.50 → raw=0.60 → L1c
    const without = grade({ mechScore: 0.70, llmRisk: 0.50 });
    expect(without.tier).toBe('L1c');

    // 高信頼救済: 0.60 - 0.08 = 0.52 → L1b
    const withRescue = grade({ mechScore: 0.70, llmRisk: 0.50, trust: 85 });
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
      llmRisk: 0.0,
      trust: 100,
      hints: ['short_answer_ok', 'paste_justified'],
    });
    expect(res.finalRisk).toBeGreaterThanOrEqual(0);
  });

  it('finalRisk は 1 を超えない（mechScore=1, llmRisk=1 でも）', () => {
    const res = grade({ mechScore: 1.0, llmRisk: 1.0 });
    expect(res.finalRisk).toBeLessThanOrEqual(1);
  });

  it('重みの和が 1.0 かつ 両スコア=0.5 → finalRisk=0.5（救済なし）', () => {
    const res = grade({ mechScore: 0.5, llmRisk: 0.5 });
    expect(res.finalRisk).toBeCloseTo(0.5);
    expect(res.tier).toBe('L1b');
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
    const res = byRisk(0.52);
    expect(res.payoutRate).toBe(0.5);
  });

  it('L1c → payoutRate=0.3', () => {
    const res = byRisk(0.65);
    expect(res.payoutRate).toBe(0.3);
  });

  it('T0 → payoutRate=0', () => {
    const res = grade({ mechScore: 0.80, llmRisk: 0.80 });
    expect(res.payoutRate).toBe(0);
  });
});
