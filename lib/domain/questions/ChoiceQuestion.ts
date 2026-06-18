import { QuestionTypeDefinition, type OptionRow } from './QuestionTypeDefinition';
import type {
  Answer,
  AnswerInput,
  QuestionAggregate,
  QuestionConfig,
  QuestionInput,
  QuestionWithOptions,
  ScaleConfig,
} from '@/lib/types/database';

/**
 * 選択肢を持つ設問の共通親クラス（単一選択・複数選択・プルダウン・スケールの基底）。
 * 選択肢の集計・CSV出力ロジックを共通化する。各サブクラスは選択肢の生成方法と
 * 回答バリデーションだけを実装すればよい。
 */
export abstract class ChoiceQuestionBase extends QuestionTypeDefinition {
  /** option_idごとの件数を数える共通集計 */
  aggregate(question: QuestionWithOptions, answers: Answer[]): QuestionAggregate {
    const optionCounts: Record<string, number> = {};
    question.options.forEach((o) => (optionCounts[o.id] = 0));
    for (const ans of answers) {
      if (ans.question_id !== question.id) continue;
      if (ans.option_id && optionCounts[ans.option_id] !== undefined) {
        optionCounts[ans.option_id] += 1;
      }
    }
    return { question, optionCounts, textAnswers: [] };
  }

  /** 選択された選択肢テキストを ' / ' で連結（単一選択なら1つ） */
  renderAnswerText(answers: Answer[], question: QuestionWithOptions): string {
    return answers
      .filter((a) => a.option_id)
      .map((a) => this.optionText(question.options, a.option_id))
      .filter(Boolean)
      .join(' / ');
  }

  /** 選択肢を持つタイプの共通の選択肢生成 */
  buildOptions(input: QuestionInput): OptionRow[] {
    return input.options
      .filter((o) => o.trim())
      .map((text, i) => ({ text: text.trim(), order_index: i }));
  }
}

/** 選択肢を2つ以上要求するタイプの共通バリデーション */
abstract class MultiOptionChoiceQuestion extends ChoiceQuestionBase {
  readonly requiresOptionInput = true;

  validateDefinition(input: QuestionInput, humanIndex: number): void {
    const valid = input.options.filter((o) => o.trim());
    if (valid.length < 2) {
      throw new Error(`設問${humanIndex}は選択肢を2つ以上入力してください`);
    }
  }
}

/** 単一選択（ラジオボタン） */
export class SingleChoiceQuestion extends MultiOptionChoiceQuestion {
  readonly type = 'single' as const;
  readonly label = 'ラジオボタン（単一選択）';
  readonly pointCost = 0.5;

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired((answer?.option_ids?.length ?? 0) >= 1, question);
  }
}

/** プルダウン（単一選択） */
export class DropdownQuestion extends MultiOptionChoiceQuestion {
  readonly type = 'dropdown' as const;
  readonly label = 'プルダウン';
  readonly pointCost = 0.5;

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired((answer?.option_ids?.length ?? 0) >= 1, question);
  }
}

/** 複数選択（チェックボックス） */
export class MultipleChoiceQuestion extends MultiOptionChoiceQuestion {
  readonly type = 'multiple' as const;
  readonly label = 'チェックボックス（複数選択）';
  readonly pointCost = 1.0;

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired((answer?.option_ids?.length ?? 0) >= 1, question);
  }
}

const DEFAULT_SCALE: ScaleConfig = { min: 1, max: 5, minLabel: null, maxLabel: null };

/** スケール（均等目盛り）。min〜max の段階を config に応じて自動生成する。 */
export class ScaleQuestion extends ChoiceQuestionBase {
  readonly type = 'scale' as const;
  readonly label = '均等目盛り（スケール）';
  readonly pointCost = 0.5;
  readonly requiresOptionInput = false;

  /** config を正規化して取得（不正値は既定値に丸める） */
  private resolveConfig(config: QuestionConfig | null): ScaleConfig {
    const c = (config ?? {}) as Partial<ScaleConfig>;
    let min = Number.isFinite(c.min) ? Math.round(c.min as number) : DEFAULT_SCALE.min;
    let max = Number.isFinite(c.max) ? Math.round(c.max as number) : DEFAULT_SCALE.max;
    // min は 0 または 1、max は 2〜10 に収める。min<max を保証。
    min = min === 0 ? 0 : 1;
    max = Math.min(10, Math.max(min + 1, max));
    return {
      min,
      max,
      minLabel: c.minLabel?.trim() ? c.minLabel.trim() : null,
      maxLabel: c.maxLabel?.trim() ? c.maxLabel.trim() : null,
    };
  }

  buildConfig(input: QuestionInput): QuestionConfig {
    return this.resolveConfig(input.config);
  }

  buildOptions(input: QuestionInput): OptionRow[] {
    const { min, max } = this.resolveConfig(input.config);
    const rows: OptionRow[] = [];
    for (let v = min, i = 0; v <= max; v++, i++) {
      rows.push({ text: String(v), order_index: i });
    }
    return rows;
  }

  validateDefinition(): void {
    // スケールは選択肢を自動生成するため、定義時の追加バリデーションは不要
  }

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired((answer?.option_ids?.length ?? 0) >= 1, question);
  }
}
