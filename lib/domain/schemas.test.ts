import { describe, expect, it } from 'vitest';
import { answerListSchema, parseJsonWith, surveyInputSchema } from './schemas';
import type { SurveyInput } from '@/lib/types/database';

const validSurvey: SurveyInput = {
  title: 'テスト',
  description: null,
  required_count: 1,
  deadline: null,
  status: 'draft',
  sections: [],
  questions: [
    {
      type: 'single',
      text: 'Q1',
      description: null,
      required: true,
      options: ['A', 'B'],
      config: null,
      section_index: 0,
      condition: null,
    },
  ],
  // PR#18 でスキーマに追加された項目（同意文・ターゲティング・信頼スコア下限・保持期間・公開範囲）
  consent_text: null,
  target_conditions: null,
  min_trust_score: null,
  retention_months: null,
  visibility: 'public',
  share_link_no_reward: false,
};

describe('surveyInputSchema', () => {
  it('正しい入力を受理する', () => {
    expect(surveyInputSchema.safeParse(validSurvey).success).toBe(true);
  });

  it('required_count が0以下は拒否', () => {
    expect(surveyInputSchema.safeParse({ ...validSurvey, required_count: 0 }).success).toBe(false);
  });

  it('未知の status は拒否', () => {
    expect(surveyInputSchema.safeParse({ ...validSurvey, status: 'archived' }).success).toBe(false);
  });

  it('title が文字列でなければ拒否', () => {
    expect(surveyInputSchema.safeParse({ ...validSurvey, title: 123 }).success).toBe(false);
  });
});

describe('answerListSchema', () => {
  it('正しい回答配列を受理する', () => {
    const answers = [{ question_id: 'q1', option_ids: ['o1'] }];
    expect(answerListSchema.safeParse(answers).success).toBe(true);
  });

  it('question_id 欠落は拒否', () => {
    expect(answerListSchema.safeParse([{ option_ids: ['o1'] }]).success).toBe(false);
  });
});

describe('parseJsonWith', () => {
  it('不正なJSONは null', () => {
    expect(parseJsonWith(surveyInputSchema, '{ broken')).toBeNull();
  });

  it('スキーマに合わないJSONは null', () => {
    expect(parseJsonWith(surveyInputSchema, JSON.stringify({ title: 1 }))).toBeNull();
  });

  it('妥当なJSONはパース結果を返す', () => {
    const result = parseJsonWith(surveyInputSchema, JSON.stringify(validSurvey));
    expect(result?.title).toBe('テスト');
  });
});
