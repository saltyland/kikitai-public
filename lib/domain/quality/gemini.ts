import type { EvaluationItem, IQualityEvaluator, QualityResult } from './types';

/**
 * Gemini API を用いた品質評価器（DESIGN_SPEC §2）。
 * GEMINI_API_KEY が設定されている場合のみ使用される。
 * 通信・パース失敗時は例外を投げ、呼び出し側（factory）がルールベースへ自動フォールバックする。
 *
 * 評価軸: 一貫性・誠実性・回答の充実度。返却形式: { score: number, feedback: string }。
 * モデル: gemini-1.5-flash。
 */
export class GeminiEvaluator implements IQualityEvaluator {
  private static readonly MODEL = 'gemini-1.5-flash';

  constructor(private readonly apiKey: string) {}

  async evaluate(items: EvaluationItem[]): Promise<QualityResult> {
    const payload = items.map((i) => ({
      question: i.question.text,
      type: i.question.type,
      answer: this.describeAnswer(i),
    }));

    const prompt = [
      'あなたはアンケート回答の品質を評価するアシスタントです。',
      '以下のJSONはある回答者の回答内容です。',
      '一貫性・誠実性・回答の充実度の観点で評価してください。',
      '出力は必ず次のJSON1個のみ（前後に文章やコードブロックを付けない）:',
      '{"score": <0〜100の整数>, "feedback": "<日本語の短い講評>"}',
      '',
      JSON.stringify(payload, null, 2),
    ].join('\n');

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GeminiEvaluator.MODEL}:generateContent` +
      `?key=${encodeURIComponent(this.apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text) as { score?: unknown; feedback?: unknown };

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    if (!Number.isFinite(score)) throw new Error('Gemini returned invalid score');
    const feedback =
      typeof parsed.feedback === 'string' && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : '評価を取得しました。';
    return { score, feedback };
  }

  /** 設問タイプに応じて回答を人間可読なテキストへ整形する */
  private describeAnswer(item: EvaluationItem): string {
    const a = item.answer;
    if (!a) return '(未回答)';
    if (a.text_answer) return a.text_answer;
    if (a.option_ids?.length) {
      return a.option_ids
        .map((id) => item.question.options.find((o) => o.id === id)?.text ?? id)
        .join(' / ');
    }
    if (a.grid_answers?.length) {
      return a.grid_answers.map((g) => `${g.row}: ${g.columns.join(',')}`).join(' / ');
    }
    return '(未回答)';
  }
}
