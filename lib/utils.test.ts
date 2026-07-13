import { describe, expect, it } from 'vitest';
import { cn, formatDateJa } from './utils';

describe('cn', () => {
  it('真値の文字列だけを連結する', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('formatDateJa', () => {
  it('YYYY-MM-DD を日本語形式にする', () => {
    expect(formatDateJa('2026-07-05')).toBe('2026年7月5日');
  });

  it('ゼロ埋めを外す', () => {
    expect(formatDateJa('2026-01-09')).toBe('2026年1月9日');
  });

  it('ISO日時は日付部分だけを整形する', () => {
    expect(formatDateJa('2026-12-31T15:00:00.000Z')).toBe('2026年12月31日');
  });

  it('null / undefined / 空文字は空文字を返す', () => {
    expect(formatDateJa(null)).toBe('');
    expect(formatDateJa(undefined)).toBe('');
    expect(formatDateJa('')).toBe('');
  });

  it('パースできない値はそのまま返す', () => {
    expect(formatDateJa('あした')).toBe('あした');
  });
});
