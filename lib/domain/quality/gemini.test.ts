import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GeminiEvaluator } from './gemini';
import type { EvaluationItem } from './types';
import type { QuestionWithOptions } from '@/lib/types/database';

function makeItem(text: string, answer: string): EvaluationItem {
  const question: QuestionWithOptions = {
    id: 'q1',
    survey_id: 's1',
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
  return { question, answer: { question_id: 'q1', text_answer: answer } };
}

function mockFetch(responseBody: unknown, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

const evaluator = new GeminiEvaluator('test-key');

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('GeminiEvaluator', () => {
  it('正常レスポンスでスコアとフィードバックを返す', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":85,"feedback":"良好な回答です。"}' }] } }],
    });
    const result = await evaluator.evaluate([makeItem('研究テーマは？', '機械学習の応用')]);
    expect(result.score).toBe(85);
    expect(result.feedback).toBe('良好な回答です。');
  });

  it('スコアは0〜100にクランプされる（上限超過）', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":150,"feedback":"テスト"}' }] } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(100);
  });

  it('スコアは0〜100にクランプされる（下限超過）', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":-10,"feedback":"テスト"}' }] } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(0);
  });

  it('APIがHTTPエラーを返したら例外を投げる', async () => {
    mockFetch({}, 429);
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow('Gemini API error: 429');
  });

  it('不正JSONが返ったら例外を投げる', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: 'not json' }] } }],
    });
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow();
  });

  it('scoreがNaNなら例外を投げる', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":"invalid","feedback":"テスト"}' }] } }],
    });
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow('invalid score');
  });

  it('feedbackが空文字のときデフォルトメッセージを返す', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":70,"feedback":""}' }] } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.feedback).toBe('評価を取得しました。');
  });

  it('ユーザー情報をペイロードに含めない（送信本文の検証）', async () => {
    const spy = mockFetch({
      candidates: [{ content: { parts: [{ text: '{"score":80,"feedback":"OK"}' }] } }],
    });
    await evaluator.evaluate([makeItem('Q', 'A')]);
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as unknown;
    const bodyStr = JSON.stringify(body);
    // user_id / email / nickname などユーザー情報が含まれないことを確認
    expect(bodyStr).not.toMatch(/user_id|email|nickname|trust_score/);
  });
});
