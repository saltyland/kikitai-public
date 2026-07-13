/**
 * evaluateWithDeadline（締切つきAI評価）のテスト。
 * 「回答者は締切以内に必ずスコアを受け取る」構造的保証を検証する。
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUALITY_DEADLINE_MS,
  evaluateWithDeadline,
  resolveQualityDeadlineMs,
} from './deadline';
import type { IQualityEvaluator, QualityResult } from './types';

const fallback: QualityResult = { score: 70, feedback: 'rule-fb' };

/** ms 後に result を返す評価器 */
function delayedEvaluator(ms: number, result: QualityResult): IQualityEvaluator {
  return {
    evaluate: () => new Promise((resolve) => setTimeout(() => resolve(result), ms)),
  };
}

/** ms 後に失敗する評価器 */
function failingEvaluator(ms = 0): IQualityEvaluator {
  return {
    evaluate: () =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI失敗')), ms)),
  };
}

describe('evaluateWithDeadline', () => {
  it('締切内にAIが完了 → AI結果を採用（timedOut=false, late=null）', async () => {
    const ai = delayedEvaluator(5, { score: 55, feedback: 'ai-fb' });
    const res = await evaluateWithDeadline(ai, [], undefined, fallback, 200);
    expect(res.quality).toEqual({ score: 55, feedback: 'ai-fb' });
    expect(res.timedOut).toBe(false);
    expect(res.late).toBeNull();
  });

  it('締切超過 → fallbackで即確定し、lateがAI完了値に解決する', async () => {
    const ai = delayedEvaluator(80, { score: 30, feedback: 'ai-late-fb' });
    const res = await evaluateWithDeadline(ai, [], undefined, fallback, 20);
    expect(res.quality).toEqual(fallback);
    expect(res.timedOut).toBe(true);
    expect(res.late).not.toBeNull();
    await expect(res.late).resolves.toEqual({ score: 30, feedback: 'ai-late-fb' });
  });

  it('締切内にAIが失敗 → fallbackを採用（timedOut=false）', async () => {
    const res = await evaluateWithDeadline(failingEvaluator(5), [], undefined, fallback, 200);
    expect(res.quality).toEqual(fallback);
    expect(res.timedOut).toBe(false);
    expect(res.late).toBeNull();
  });

  it('締切超過後にAIが失敗 → lateはnullに解決する（rejectしない）', async () => {
    const res = await evaluateWithDeadline(failingEvaluator(80), [], undefined, fallback, 20);
    expect(res.quality).toEqual(fallback);
    expect(res.timedOut).toBe(true);
    await expect(res.late).resolves.toBeNull();
  });
});

describe('resolveQualityDeadlineMs', () => {
  it('未設定ならデフォルト値', () => {
    expect(resolveQualityDeadlineMs({})).toBe(DEFAULT_QUALITY_DEADLINE_MS);
  });

  it('数値文字列なら採用', () => {
    expect(resolveQualityDeadlineMs({ QUALITY_DEADLINE_MS: '2500' })).toBe(2500);
  });

  it('不正値（非数値・0以下）はデフォルトに退避', () => {
    expect(resolveQualityDeadlineMs({ QUALITY_DEADLINE_MS: 'abc' })).toBe(
      DEFAULT_QUALITY_DEADLINE_MS
    );
    expect(resolveQualityDeadlineMs({ QUALITY_DEADLINE_MS: '0' })).toBe(
      DEFAULT_QUALITY_DEADLINE_MS
    );
    expect(resolveQualityDeadlineMs({ QUALITY_DEADLINE_MS: '-100' })).toBe(
      DEFAULT_QUALITY_DEADLINE_MS
    );
  });
});
