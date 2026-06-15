import { describe, expect, it } from 'vitest';
import {
  editSimilarity,
  extractContentWords,
  formulaicRatio,
  hammingDistance,
  keywordCoverage,
  levenshtein,
  simHash64,
} from './text';
import { cosineSimilarity, l2normalize } from './encoder';
import { HashingEncoder } from './hashingEncoder';
import { LocalEmbeddingEvaluator } from './localEvaluator';
import type { QuestionWithOptions } from '@/lib/types/database';

describe('text 特徴量（B-1ヘルパ）', () => {
  it('extractContentWords は漢字/カタカナ/英数の内容語を拾う', () => {
    const w = extractContentWords('東京のレストランでpizzaを食べた');
    expect(w).toContain('東京');
    expect(w).toContain('レストラン');
    expect(w).toContain('pizza');
  });

  it('formulaicRatio: 定型句のみは1、内容のある文は低い', () => {
    expect(formulaicRatio('特になし')).toBe(1);
    expect(formulaicRatio('週末に友人と映画を見て楽しかった')).toBeLessThan(0.3);
  });

  it('keywordCoverage: 設問内容語が回答に出れば高い', () => {
    const cov = keywordCoverage('東京の交通について', '東京の交通はとても便利です');
    expect(cov).not.toBeNull();
    expect(cov as number).toBeGreaterThan(0);
  });

  it('levenshtein / editSimilarity', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(editSimilarity('丸写しの文章です', '丸写しの文章です')).toBe(1);
    expect(editSimilarity('全く違う', 'completely different')).toBeLessThan(0.3);
  });

  it('simHash: 似た文はハミング距離が小さい', () => {
    const a = simHash64('対応が丁寧で満足できる内容でした');
    const b = simHash64('対応が丁寧で満足できる内容でした。');
    const c = simHash64('まったく無関係なランダム文字列xyz123');
    expect(hammingDistance(a, b)).toBeLessThan(hammingDistance(a, c));
  });
});

describe('HashingEncoder（決定論的フォールバック）', () => {
  it('同一テキストは同一ベクトル（決定論）', async () => {
    const enc = new HashingEncoder(64);
    const v1 = await enc.embed('テスト文');
    const v2 = await enc.embed('テスト文');
    expect(v1).toEqual(v2);
    expect(v1.length).toBe(64);
  });

  it('L2正規化されている（自己コサイン≒1）', async () => {
    const enc = new HashingEncoder();
    const v = await enc.embed('正規化の確認');
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('類似テキスト同士は無関係テキストより近い', async () => {
    const enc = new HashingEncoder();
    const base = await enc.embed('東京タワーに行きました');
    const near = await enc.embed('東京タワーへ行ってきました');
    const far = await enc.embed('量子力学の数式について');
    expect(cosineSimilarity(base, near)).toBeGreaterThan(cosineSimilarity(base, far));
  });

  it('l2normalize はゼロベクトルで例外を出さない', () => {
    expect(l2normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

function tq(text: string): QuestionWithOptions {
  return {
    id: 'q1',
    survey_id: 's',
    type: 'paragraph',
    text,
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: 0,
    condition: null,
    options: [],
  };
}

describe('LocalEmbeddingEvaluator（安全側の既定動作）', () => {
  it('参照ベクトル無し・分類器未学習なら減点しない（100）', async () => {
    const evaluator = new LocalEmbeddingEvaluator(null, () => Promise.resolve(new HashingEncoder()));
    const res = await evaluator.evaluate([
      { question: tq('好きな食べ物は？'), answer: { question_id: 'q1', text_answer: '寿司が好きです' } },
    ]);
    expect(res.score).toBe(100);
  });

  it('自由記述が無ければ対象外で満点', async () => {
    const evaluator = new LocalEmbeddingEvaluator(null, () => Promise.resolve(new HashingEncoder()));
    const res = await evaluator.evaluate([
      { question: { ...tq('色'), type: 'single' }, answer: { question_id: 'q1', option_ids: ['x'] } },
    ]);
    expect(res.score).toBe(100);
  });
});
