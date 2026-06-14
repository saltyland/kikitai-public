import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GroqEvaluator } from './groq';
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

const evaluator = new GroqEvaluator('test-key');

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('GroqEvaluator', () => {
  it('正常レスポンスでスコアとフィードバックを返す', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":72,"feedback":"概ね適切な回答です。"}' } }],
    });
    const result = await evaluator.evaluate([makeItem('研究動機は？', 'AIの社会応用に興味があります')]);
    expect(result.score).toBe(72);
    expect(result.feedback).toBe('概ね適切な回答です。');
  });

  it('スコアは0〜100にクランプされる（上限超過）', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":999,"feedback":"テスト"}' } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(100);
  });

  it('スコアは0〜100にクランプされる（下限超過）', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":-5,"feedback":"テスト"}' } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(0);
  });

  it('レート上限（429）でHTTPエラーなら例外を投げる', async () => {
    mockFetch({}, 429);
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow('Groq API error: 429');
  });

  it('サーバー障害（500）でも例外を投げる', async () => {
    mockFetch({}, 500);
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow('Groq API error: 500');
  });

  it('不正JSONが返ったら例外を投げる', async () => {
    mockFetch({
      choices: [{ message: { content: 'broken json' } }],
    });
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow();
  });

  it('scoreがNaNなら例外を投げる', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":"abc","feedback":"テスト"}' } }],
    });
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow('invalid score');
  });

  it('feedbackが空文字のときデフォルトメッセージを返す', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":60,"feedback":"  "}' } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.feedback).toBe('評価を取得しました。');
  });

  it('ユーザー情報をペイロードに含めない', async () => {
    const spy = mockFetch({
      choices: [{ message: { content: '{"score":80,"feedback":"OK"}' } }],
    });
    await evaluator.evaluate([makeItem('Q', 'A')]);
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as unknown;
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/user_id|email|nickname|trust_score/);
  });

  it('Authorizationヘッダーにキーが含まれる', async () => {
    const spy = mockFetch({
      choices: [{ message: { content: '{"score":80,"feedback":"OK"}' } }],
    });
    await evaluator.evaluate([makeItem('Q', 'A')]);
    const headers = spy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key');
  });
});
