import { ChoiceQuestionBase } from './ChoiceQuestion';
import type {
  AnswerInput,
  AttentionConfig,
  QuestionConfig,
  QuestionInput,
  QuestionWithOptions,
} from '@/lib/types/database';

/**
 * アテンションチェック設問（単一選択）。
 * 「この設問では『○○』を選んでください」のように正解を指定し、
 * 不正解の回答は品質評価（RuleBasedEvaluator）でスコア0になる。
 * 正解選択肢テキストは config.correctOptionText に保持する。
 */
export class AttentionCheckQuestion extends ChoiceQuestionBase {
  readonly type = 'attention' as const;
  readonly label = 'アテンションチェック';
  readonly pointCost = 0.5;
  readonly requiresOptionInput = true;

  /** config から正解選択肢テキストを取り出す（未設定は null） */
  static correctOptionText(config: QuestionConfig | null): string | null {
    const text = (config as Partial<AttentionConfig> | null)?.correctOptionText;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  }

  buildConfig(input: QuestionInput): QuestionConfig {
    const correct = AttentionCheckQuestion.correctOptionText(input.config) ?? '';
    return { correctOptionText: correct } satisfies AttentionConfig;
  }

  validateDefinition(input: QuestionInput, humanIndex: number): void {
    const valid = input.options.map((o) => o.trim()).filter(Boolean);
    if (valid.length < 2) {
      throw new Error(`設問${humanIndex}は選択肢を2つ以上入力してください`);
    }
    const correct = AttentionCheckQuestion.correctOptionText(input.config);
    if (!correct) {
      throw new Error(`設問${humanIndex}（アテンションチェック）は正解の選択肢を指定してください`);
    }
    if (!valid.includes(correct)) {
      throw new Error(
        `設問${humanIndex}（アテンションチェック）の正解「${correct}」が選択肢に含まれていません`
      );
    }
  }

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired((answer?.option_ids?.length ?? 0) >= 1, question);
  }
}
