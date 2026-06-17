'use server';

import { z } from 'zod';
import { generateSurveyDraft } from '@/lib/domain/generation';
import type { GeneratedSurveyDraft } from '@/lib/domain/generation';

// 入力バリデーション: プロンプトインジェクションと API コスト爆発を防ぐ
const requestSchema = z.object({
  theme: z.string().min(1).max(200),
  purpose: z.string().max(500).optional(),
  targetAudience: z.string().max(200).optional(),
  questionCount: z.number().int().min(5).max(15),
  includeAttentionCheck: z.boolean(),
});

export async function generateSurveyDraftAction(
  rawReq: unknown,
): Promise<{ draft: GeneratedSurveyDraft } | { error: string }> {
  const parsed = requestSchema.safeParse(rawReq);
  if (!parsed.success) {
    return { error: `入力値が不正です: ${parsed.error.message}` };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY が設定されていません' };
  }
  try {
    const draft = await generateSurveyDraft(parsed.data, apiKey);
    return { draft };
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return { error: `生成に失敗しました: ${message}` };
  }
}
