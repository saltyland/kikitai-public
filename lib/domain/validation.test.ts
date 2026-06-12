import { describe, expect, it } from 'vitest';
import { hasBlockingWarning, validateEditorQuestion, type EditorQuestionLike } from './validation';

function base(overrides: Partial<EditorQuestionLike> = {}): EditorQuestionLike {
  return {
    key: 'k',
    type: 'text',
    text: '質問',
    options: [],
    config: {},
    condition: null,
    ...overrides,
  };
}

describe('validateEditorQuestion', () => {
  it('設問文が空ならerror', () => {
    const w = validateEditorQuestion(base({ text: '  ' }));
    expect(w.some((x) => x.level === 'error' && x.message.includes('設問文'))).toBe(true);
  });

  it('選択式は選択肢が2つ未満でerror', () => {
    const w = validateEditorQuestion(base({ type: 'single', options: ['1つだけ'] }));
    expect(w.some((x) => x.level === 'error' && x.message.includes('2つ以上'))).toBe(true);
  });

  it('空の選択肢・重複はwarn', () => {
    const w = validateEditorQuestion(base({ type: 'single', options: ['A', 'A', ''] }));
    expect(w.some((x) => x.level === 'warn' && x.message.includes('空の選択肢'))).toBe(true);
    expect(w.some((x) => x.level === 'warn' && x.message.includes('重複'))).toBe(true);
  });

  it('正しい単一選択は警告なし', () => {
    const w = validateEditorQuestion(base({ type: 'single', options: ['A', 'B'] }));
    expect(w).toHaveLength(0);
  });

  it('スケールはmax<=minでerror', () => {
    const w = validateEditorQuestion(base({ type: 'scale', config: { min: 3, max: 3 } }));
    expect(w.some((x) => x.level === 'error')).toBe(true);
  });

  it('グリッドは行・列が空でerror', () => {
    const w = validateEditorQuestion(base({ type: 'grid', config: { rows: [], columns: [] } }));
    expect(w.filter((x) => x.level === 'error')).toHaveLength(2);
  });

  it('表示条件の参照先が無ければwarn', () => {
    const q = base({ type: 'single', options: ['A', 'B'], condition: { sourceKey: 'missing', optionText: 'A' } });
    const w = validateEditorQuestion(q, new Map());
    expect(w.some((x) => x.level === 'warn' && x.message.includes('参照先'))).toBe(true);
  });
});

describe('hasBlockingWarning', () => {
  it('errorが1件でもあればtrue', () => {
    expect(hasBlockingWarning([{ level: 'warn', message: 'a' }, { level: 'error', message: 'b' }])).toBe(true);
  });
  it('warnだけならfalse', () => {
    expect(hasBlockingWarning([{ level: 'warn', message: 'a' }])).toBe(false);
  });
});
