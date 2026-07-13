import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LocalLLMEvaluator } from './local';
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

const evaluator = new LocalLLMEvaluator('http://127.0.0.1:11434/v1');

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LocalLLMEvaluator', () => {
  it('正常レスポンスでスコアとフィードバックを返す', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":72,"feedback":"概ね適切な回答です。"}' } }],
    });
    const result = await evaluator.evaluate([makeItem('研究動機は？', 'AIの社会応用に興味があります')]);
    expect(result.score).toBe(72);
    expect(result.feedback).toBe('概ね適切な回答です。');
  });

  it('コードフェンス付きJSONでもパースできる（小型モデルの出力ゆらぎ耐性）', async () => {
    mockFetch({
      choices: [
        { message: { content: '```json\n{"score":55,"feedback":"具体性が不足しています。"}\n```' } },
      ],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(55);
    expect(result.feedback).toBe('具体性が不足しています。');
  });

  it('<think>ブロック混入でもパースできる（reasoning系モデル耐性）', async () => {
    mockFetch({
      choices: [
        {
          message: {
            content:
              '<think>この回答は具体性に欠ける{要検討}</think>\n{"score":40,"feedback":"一般論にとどまっています。"}',
          },
        },
      ],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(40);
    expect(result.feedback).toBe('一般論にとどまっています。');
  });

  it('JSON前後に文章が付いていてもパースできる', async () => {
    mockFetch({
      choices: [
        { message: { content: '評価結果は以下の通りです。\n{"score":63,"feedback":"標準的です。"}\n以上。' } },
      ],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(63);
  });

  it('コンパクト形式（フラット軸点数）で軸合計を score とする', async () => {
    mockFetch({
      choices: [
        {
          message: {
            content:
              '{"relevance":10,"specificity":5,"consistency":12,"integrity":10,"feedback":"具体性が不足しています。"}',
          },
        },
      ],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(37);
    expect(result.feedback).toBe('具体性が不足しています。');
  });

  it('旧ネスト形式（axes）でも軸合計を score として優先する', async () => {
    mockFetch({
      choices: [
        {
          message: {
            content:
              '{"axes":{"relevance":{"reason":"r","score":10},"specificity":{"reason":"s","score":5},"consistency":{"reason":"c","score":12},"integrity":{"reason":"i","score":10}},"score":99,"feedback":"軸合計を優先"}',
          },
        },
      ],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(37);
  });

  it('スコアは0〜100にクランプされる（上限超過）', async () => {
    mockFetch({
      choices: [{ message: { content: '{"score":999,"feedback":"テスト"}' } }],
    });
    const result = await evaluator.evaluate([makeItem('Q', 'A')]);
    expect(result.score).toBe(100);
  });

  it('HTTPエラー（500）なら例外を投げる', async () => {
    mockFetch({}, 500);
    await expect(evaluator.evaluate([makeItem('Q', 'A')])).rejects.toThrow(
      'Local LLM API error: 500'
    );
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

  it('ベースURLの末尾形式によらず /chat/completions を叩く', async () => {
    for (const base of [
      'http://127.0.0.1:11434/v1',
      'http://127.0.0.1:11434/v1/',
      'http://127.0.0.1:11434/v1/chat/completions',
    ]) {
      const spy = mockFetch({
        choices: [{ message: { content: '{"score":80,"feedback":"OK"}' } }],
      });
      await new LocalLLMEvaluator(base).evaluate([makeItem('Q', 'A')]);
      expect(spy.mock.calls[0][0]).toBe('http://127.0.0.1:11434/v1/chat/completions');
      vi.restoreAllMocks();
    }
  });

  it('指定したモデル名がリクエストに含まれる', async () => {
    const spy = mockFetch({
      choices: [{ message: { content: '{"score":80,"feedback":"OK"}' } }],
    });
    await new LocalLLMEvaluator('http://127.0.0.1:11434/v1', 'qwen2.5:3b-instruct').evaluate([
      makeItem('Q', 'A'),
    ]);
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as { model?: string };
    expect(body.model).toBe('qwen2.5:3b-instruct');
  });
});
