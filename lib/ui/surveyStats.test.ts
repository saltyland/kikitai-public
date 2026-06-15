import { describe, expect, it } from 'vitest';
import { calcProgress } from './surveyStats';

describe('calcProgress', () => {
  it('0件のときは0%', () => {
    expect(calcProgress(0, 10)).toBe(0);
  });

  it('回答数と必要数から進捗率を算出する', () => {
    expect(calcProgress(5, 10)).toBe(50);
    expect(calcProgress(10, 10)).toBe(100);
  });

  it('必要数を超えても100%に丸める', () => {
    expect(calcProgress(15, 10)).toBe(100);
  });

  it('requiredCountが0の場合は0%（0除算ガード）', () => {
    expect(calcProgress(0, 0)).toBe(0);
    expect(calcProgress(5, 0)).toBe(0);
  });
});
