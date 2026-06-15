import { expect, test } from 'vitest';
import { sanitizeItems } from './sanitize';
import type { EvaluationItem } from './types';
import type { QuestionWithOptions, AnswerInput } from '@/lib/types/database';

function makeItem(
  overrides: Partial<{
    type: QuestionWithOptions['type'];
    text: string;
    optionTexts: string[];
    answer: AnswerInput;
    correctOptionText: string;
  }> = {},
): EvaluationItem {
  const opts = overrides.optionTexts ?? ['選択肢A', '選択肢B'];
  return {
    question: {
      id: 'q1',
      survey_id: 'survey-uuid',
      type: overrides.type ?? 'single',
      text: overrides.text ?? '設問文',
      description: '補足説明',
      required: true,
      config: null,
      section_index: 0,
      order_index: 0,
      condition: { sourceQuestionOrder: 1, optionText: '条件' },
      options: opts.map((t, i) => ({
        id: `opt${i}`,
        question_id: 'q1',
        text: t,
        order_index: i,
      })),
    },
    answer: overrides.answer,
    correctOptionText: overrides.correctOptionText,
  };
}

// ---------- ホワイトリスト再構築 ----------

test('survey_id が空文字に置き換わる', () => {
  const [out] = sanitizeItems([makeItem()]);
  expect(out.question.survey_id).toBe('');
});

test('description が null に置き換わる', () => {
  const [out] = sanitizeItems([makeItem()]);
  expect(out.question.description).toBeNull();
});

test('condition が null に置き換わる', () => {
  const [out] = sanitizeItems([makeItem()]);
  expect(out.question.condition).toBeNull();
});

test('設問の text / type / order_index は保持される', () => {
  const [out] = sanitizeItems([makeItem({ text: 'テスト設問', type: 'multiple' })]);
  expect(out.question.text).toBe('テスト設問');
  expect(out.question.type).toBe('multiple');
  expect(out.question.order_index).toBe(0);
});

test('選択肢の text は保持されるが question_id は空文字になる', () => {
  const [out] = sanitizeItems([makeItem({ optionTexts: ['A', 'B', 'C'] })]);
  expect(out.question.options.map((o) => o.text)).toEqual(['A', 'B', 'C']);
  expect(out.question.options.every((o) => o.question_id === '')).toBe(true);
});

test('answer が undefined の場合もそのまま返る', () => {
  const [out] = sanitizeItems([makeItem()]);
  expect(out.answer).toBeUndefined();
});

test('option_ids は保持される', () => {
  const answer: AnswerInput = { question_id: 'q1', option_ids: ['opt0'] };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.option_ids).toEqual(['opt0']);
});

test('correctOptionText は保持される', () => {
  const [out] = sanitizeItems([makeItem({ correctOptionText: '正解選択肢' })]);
  expect(out.correctOptionText).toBe('正解選択肢');
});

// ---------- PIIスクラブ ----------

test('メールアドレスが [EMAIL] に置換される', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: '連絡先はuser@example.comです',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('連絡先は[EMAIL]です');
  expect(out.answer?.text_answer).not.toContain('@');
});

test('電話番号が [PHONE] に置換される', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: '電話番号は090-1234-5678です',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('電話番号は[PHONE]です');
});

test('連番IDが [ID] に置換される', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: '学籍番号はABC123456です',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('学籍番号は[ID]です');
});

test('URLが [URL] に置換される', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: 'サイトはhttps://example.com/pathを参照',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('サイトは[URL]を参照');
});

test('複数種類のPIIが同時にスクラブされる', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: 'メール: foo@bar.com、URL: https://foo.example',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('メール: [EMAIL]、URL: [URL]');
});

test('PIIを含まないテキストはそのまま保持される', () => {
  const answer: AnswerInput = {
    question_id: 'q1',
    text_answer: '普通の回答テキストです。特に個人情報はありません。',
  };
  const [out] = sanitizeItems([makeItem({ answer })]);
  expect(out.answer?.text_answer).toBe('普通の回答テキストです。特に個人情報はありません。');
});

// ---------- 冪等性 ----------

test('二重適用しても結果が変わらない（冪等）', () => {
  const item = makeItem({
    answer: {
      question_id: 'q1',
      text_answer: 'メール: user@example.com、URL: https://test.io',
    },
  });
  const once = sanitizeItems([item]);
  const twice = sanitizeItems(once);
  expect(twice[0].answer?.text_answer).toBe(once[0].answer?.text_answer);
});

test('PIIのないアイテムを二重適用しても変わらない', () => {
  const item = makeItem({ answer: { question_id: 'q1', text_answer: '普通の回答' } });
  const once = sanitizeItems([item]);
  const twice = sanitizeItems(once);
  expect(twice[0].answer?.text_answer).toBe('普通の回答');
  expect(twice[0].question.survey_id).toBe('');
});
