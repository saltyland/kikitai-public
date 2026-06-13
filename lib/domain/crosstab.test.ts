import { describe, it, expect } from 'vitest';
import { buildCrossTab, cramersV, isCrossTabbable, selectedOptionIds } from './crosstab';
import type { Answer, SurveyWithQuestions, UserResponse } from '@/lib/types/database';

/** テスト用の最小限な設問を組み立てる */
function q(id: string, type: SurveyWithQuestions['questions'][number]['type'], opts: [string, string][]) {
  return {
    id,
    survey_id: 's1',
    type,
    text: id,
    required: false,
    order_index: 0,
    config: null,
    options: opts.map(([oid, text], i) => ({
      id: oid,
      question_id: id,
      text,
      order_index: i,
    })),
  } as SurveyWithQuestions['questions'][number];
}

function ans(responseId: string, questionId: string, optionId: string): Answer {
  return {
    id: `${responseId}-${questionId}-${optionId}`,
    response_id: responseId,
    question_id: questionId,
    option_id: optionId,
    text_answer: null,
    row_label: null,
  };
}

function resp(responseId: string, answers: Answer[]): UserResponse {
  return {
    responseId,
    userId: null,
    nickname: 'ゲスト',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    answers,
  };
}

const survey = {
  id: 's1',
  questions: [
    q('gender', 'single', [
      ['m', '男性'],
      ['f', '女性'],
    ]),
    q('pref', 'single', [
      ['a', '賛成'],
      ['b', '反対'],
    ]),
    q('free', 'text', []),
  ],
} as unknown as SurveyWithQuestions;

describe('isCrossTabbable', () => {
  it('選択式は対象、テキスト/日付は対象外', () => {
    expect(isCrossTabbable('single')).toBe(true);
    expect(isCrossTabbable('multiple')).toBe(true);
    expect(isCrossTabbable('scale')).toBe(true);
    expect(isCrossTabbable('text')).toBe(false);
    expect(isCrossTabbable('date')).toBe(false);
  });
});

describe('selectedOptionIds', () => {
  it('回答者が選んだoption_idを返す', () => {
    const r = resp('r1', [ans('r1', 'gender', 'm'), ans('r1', 'pref', 'a')]);
    expect(selectedOptionIds(r, 'gender')).toEqual(['m']);
    expect(selectedOptionIds(r, 'pref')).toEqual(['a']);
    expect(selectedOptionIds(r, 'none')).toEqual([]);
  });
});

describe('buildCrossTab', () => {
  const responses = [
    resp('r1', [ans('r1', 'gender', 'm'), ans('r1', 'pref', 'a')]),
    resp('r2', [ans('r2', 'gender', 'm'), ans('r2', 'pref', 'b')]),
    resp('r3', [ans('r3', 'gender', 'f'), ans('r3', 'pref', 'a')]),
    resp('r4', [ans('r4', 'gender', 'f'), ans('r4', 'pref', 'a')]),
    // 列が未回答 → 除外
    resp('r5', [ans('r5', 'gender', 'f')]),
  ];

  it('同時度数を正しく数え、未回答は除外する', () => {
    const ct = buildCrossTab(survey, responses, 'gender', 'pref')!;
    expect(ct.rowLabels).toEqual(['男性', '女性']);
    expect(ct.colLabels).toEqual(['賛成', '反対']);
    // 男性: 賛成1 反対1 / 女性: 賛成2 反対0
    expect(ct.matrix).toEqual([
      [1, 1],
      [2, 0],
    ]);
    expect(ct.rowTotals).toEqual([2, 2]);
    expect(ct.colTotals).toEqual([3, 1]);
    expect(ct.grandTotal).toBe(4);
    expect(ct.excludedCount).toBe(1);
  });

  it('対象外タイプを含むと null', () => {
    expect(buildCrossTab(survey, responses, 'gender', 'free')).toBeNull();
  });
});

describe('cramersV', () => {
  it('完全連関は1に近づく', () => {
    const responses = [
      resp('r1', [ans('r1', 'gender', 'm'), ans('r1', 'pref', 'a')]),
      resp('r2', [ans('r2', 'gender', 'm'), ans('r2', 'pref', 'a')]),
      resp('r3', [ans('r3', 'gender', 'f'), ans('r3', 'pref', 'b')]),
      resp('r4', [ans('r4', 'gender', 'f'), ans('r4', 'pref', 'b')]),
    ];
    const ct = buildCrossTab(survey, responses, 'gender', 'pref')!;
    expect(cramersV(ct)).toBeCloseTo(1, 5);
  });

  it('無関連は0に近い', () => {
    const responses = [
      resp('r1', [ans('r1', 'gender', 'm'), ans('r1', 'pref', 'a')]),
      resp('r2', [ans('r2', 'gender', 'm'), ans('r2', 'pref', 'b')]),
      resp('r3', [ans('r3', 'gender', 'f'), ans('r3', 'pref', 'a')]),
      resp('r4', [ans('r4', 'gender', 'f'), ans('r4', 'pref', 'b')]),
    ];
    const ct = buildCrossTab(survey, responses, 'gender', 'pref')!;
    expect(cramersV(ct)).toBeCloseTo(0, 5);
  });
});
