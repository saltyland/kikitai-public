import { z } from 'zod';
import type { AnswerInput, SurveyInput } from '@/lib/types/database';

/**
 * サーバーアクションの入力検証スキーマ（zod）。
 *
 * クライアントから JSON 文字列で送られる payload は改ざん可能なため、
 * JSON.parse の構文チェックだけでなく、ここで構造・型を実行時に検証する。
 * 業務ルール（タイトル必須・設問タイプ固有の検証など）は従来どおり
 * サービス層（surveyService.validate / QuestionTypeRegistry）が担う。
 */

const questionConditionSchema = z.object({
  sourceQuestionOrder: z.number().int().min(0),
  optionText: z.string().max(500),
});

const sectionMetaSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
});

const scaleConfigSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  minLabel: z.string().max(100).nullable(),
  maxLabel: z.string().max(100).nullable(),
});

const gridConfigSchema = z.object({
  rows: z.array(z.string().max(200)).max(50),
  columns: z.array(z.string().max(200)).max(50),
  multiple: z.boolean(),
});

const attentionConfigSchema = z.object({
  correctOptionText: z.string().max(500),
});

const questionInputSchema = z.object({
  type: z.enum([
    'single',
    'multiple',
    'dropdown',
    'text',
    'paragraph',
    'date',
    'scale',
    'grid',
    'attention',
  ]),
  text: z.string().max(1000),
  description: z.string().max(2000).nullable(),
  required: z.boolean(),
  options: z.array(z.string().max(500)).max(100),
  config: z.union([scaleConfigSchema, gridConfigSchema, attentionConfigSchema]).nullable(),
  section_index: z.number().int().min(0),
  condition: questionConditionSchema.nullable(),
});

const targetConditionsSchema = z.object({
  ageMin: z.number().int().min(0).max(150).nullable().optional(),
  ageMax: z.number().int().min(0).max(150).nullable().optional(),
  genders: z.array(z.string().max(50)).max(20).optional(),
  occupations: z.array(z.string().max(100)).max(50).optional(),
});

export const surveyInputSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(5000).nullable(),
  required_count: z.number().int().min(1).max(100000),
  deadline: z.string().max(30).nullable(),
  status: z.enum(['draft', 'open', 'closed']),
  sections: z.array(sectionMetaSchema).max(50),
  questions: z.array(questionInputSchema).max(200),
  consent_text: z.string().max(10000).nullable(),
  target_conditions: targetConditionsSchema.nullable(),
  min_trust_score: z.number().int().min(0).max(100).nullable(),
  retention_months: z.number().int().min(1).max(120).nullable(),
  visibility: z.enum(['public', 'unlisted']),
}) satisfies z.ZodType<SurveyInput>;

const gridRowAnswerSchema = z.object({
  row: z.string().max(200),
  columns: z.array(z.string().max(200)).max(50),
});

const answerInputSchema = z.object({
  question_id: z.string().min(1).max(100),
  option_ids: z.array(z.string().min(1).max(100)).max(100).optional(),
  text_answer: z.string().max(10000).optional(),
  grid_answers: z.array(gridRowAnswerSchema).max(50).optional(),
}) satisfies z.ZodType<AnswerInput>;

export const answerListSchema = z.array(answerInputSchema).max(200);

/**
 * JSON文字列をパースしてスキーマ検証する。失敗時は null を返す。
 * サーバーアクションから共通で使う。
 */
export function parseJsonWith<T>(schema: z.ZodType<T>, raw: string): T | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}
