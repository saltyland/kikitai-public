import type { QuestionType, SignalMeta } from '@/lib/types/database';

/** アンケート生成リクエスト */
export interface GenerationRequest {
  /** アンケートのテーマ（例: 「大学生の睡眠習慣に関する研究」） */
  theme: string;
  /** 調査の目的（任意） */
  purpose?: string;
  /** 想定回答者（任意・例: 「大学1〜4年生」） */
  targetAudience?: string;
  /** 生成する設問数（5〜15） */
  questionCount: number;
  /** アテンションチェックを含めるか（デフォルト: true） */
  includeAttentionCheck: boolean;
}

/** Geminiが返す設問1件の生成結果 */
export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  description: string | null;
  required: boolean;
  options: string[];
  config: {
    min?: number;
    max?: number;
    minLabel?: string | null;
    maxLabel?: string | null;
    rows?: string[];
    columns?: string[];
    multiple?: boolean;
    correctOptionText?: string;
  } | null;
  signal_meta: SignalMeta;
}

/** Geminiが返すアンケート下書き全体 */
export interface GeneratedSurveyDraft {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}
