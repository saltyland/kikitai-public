import type { GeneratedSurveyDraft, GenerationRequest } from './types';

const MODEL = 'gemini-2.5-flash';

/** Gemini API を使ってアンケートの下書きを生成する */
export async function generateSurveyDraft(
  req: GenerationRequest,
  apiKey: string,
): Promise<GeneratedSurveyDraft> {
  const questionCountNote = req.includeAttentionCheck
    ? `（${req.questionCount}問中1〜2問をアテンションチェックに充てる）`
    : `（${req.questionCount}問すべてを通常設問にする）`;

  const prompt = [
    'あなたは学術アンケートの品質評価専門家です。',
    '以下のテーマで、AIによる回答品質評価が正確に行えるアンケートを設計してください。',
    '',
    `テーマ: ${req.theme}`,
    req.purpose ? `目的: ${req.purpose}` : '',
    req.targetAudience ? `対象者: ${req.targetAudience}` : '',
    `設問数: ${req.questionCount}問 ${questionCountNote}`,
    '',
    '【設計ステップ（Chain-of-Thought）】',
    'Step1: アンケート全体の構成を考える',
    '  - 導入（基本属性・経験）→ 本題（評価・意見）→ フォローアップ（詳細・自由記述）の3段階',
    '  - 設問タイプのバランス: 選択式7割・スケール1〜2問・自由記述1〜2問を目安に',
    '',
    'Step2: 品質シグナル設問を決める',
    '  - consistency_anchor + consistency_check のペアを1組設計する',
    '    （同一概念を異なる表現で尋ね、回答の矛盾を検出する）',
    '  - open_signal: 評価尺度問の直後に自由記述問を1問配置する',
    req.includeAttentionCheck
      ? '  - attention_check: 設問中盤〜後半に1〜2問配置する（正解が唯一かつ明確なもの）'
      : '  - アテンションチェックは含めない',
    '',
    'Step3: 各設問のテキストと選択肢を書く',
    '  - 具体的で明確な表現にする（曖昧な設問はAI評価の精度を下げる）',
    '  - consistency_check の contradictsWith に、anchor の"肯定回答"と矛盾する選択肢テキストを指定する',
    '  - consistency_anchor の positiveOptions に「肯定回答」とみなす選択肢テキストをすべて指定する',
    '    （選択肢の順序は評価エンジンが保証しないため、インデックスではなくテキストで指定すること）',
    `    例: 睡眠anchor の positiveOptions: ["毎日取れている", "ほぼ取れている"]`,
    '',
    'Step4: signal_meta を各設問に付与する',
    '  - すべての設問に role を設定する（省略不可）',
    '  - consistency_anchor / consistency_check には同じ pairKey を設定する',
    `  - 設問数が8問未満の場合、シグナル設問は attention_check 1問のみとし、`,
    `    consistency ペアと open_signal は含めないこと`,
    '',
    '使用できる設問タイプ（typeフィールド）:',
    '  single（ラジオ）/ multiple（チェック）/ dropdown / text（短文）/ paragraph（長文）',
    '  / attention（アテンションチェック）',
    '  ※ scale と grid は使用しないこと（config の構造が複雑になり品質が低下する）',
    '',
    '注意: attention タイプを使う場合、config.correctOptionText に正解の選択肢テキストを設定する',
  ].filter(Boolean).join('\n');

  // responseSchema で型を強制する
  // 注意: Gemini responseSchema は OpenAPI サブセットであり nullable: true は非サポート。
  //       null 許容は type 配列 ["string", "null"] で表現する。
  const responseSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              // scale / grid はプロンプトで禁止しているが schema でも除外して二重ガード
              enum: ['single', 'multiple', 'dropdown', 'text', 'paragraph', 'attention'],
            },
            text: { type: 'string' },
            description: { type: ['string', 'null'] },
            required: { type: 'boolean' },
            options: { type: 'array', items: { type: 'string' } },
            config: { type: ['object', 'null'] },
            signal_meta: {
              type: 'object',
              properties: {
                role: {
                  type: 'string',
                  enum: ['standard', 'attention_check', 'consistency_anchor', 'consistency_check', 'open_signal'],
                },
                pairKey: { type: ['string', 'null'] },
                contradictsWith: { type: 'array', items: { type: 'string' } },
                positiveOptions: { type: 'array', items: { type: 'string' } },
              },
              required: ['role'],
            },
          },
          required: ['type', 'text', 'required', 'options', 'signal_meta'],
        },
      },
    },
    required: ['title', 'description', 'questions'],
  };

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  // Gemini 2.5 Flash は大きなリクエストで 30〜60 秒かかることがある。
  // Vercel のデフォルトタイムアウト（30 秒）より長く設定して 504 を防ぐ。
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let draft: GeneratedSurveyDraft;
  try {
    draft = JSON.parse(rawText) as GeneratedSurveyDraft;
  } catch (e) {
    throw new Error(`Gemini JSON parse failed: ${String(e)}\nraw: ${rawText.slice(0, 200)}`);
  }

  if (!draft.title || !Array.isArray(draft.questions)) {
    throw new Error('Gemini returned invalid survey draft');
  }
  return draft;
}
