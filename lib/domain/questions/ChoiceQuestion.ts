import { QuestionTypeDefinition, type OptionRow } from './QuestionTypeDefinition';
import type {
  Answer,
  AnswerInput,
  QuestionAggregate,
  QuestionInput,
  QuestionWithOptions,
} from '@/lib/types/database';

/**
 * 選択肢を持つ設問の共通親クラス（単一選択・複数選択・スケールの基底）。
 * 選択肢の集計ロジックを共通化する。各サブクラスは選択肢の生成方法と
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
}

/** 単一選択（ラジオボタン） */
export class SingleChoiceQuestion extends ChoiceQuestionBase {
  readonly type = 'single' as const;
  readonly label = '単一選択';
  readonly pointCost = 0.5;
  readonly requiresOptionInput = true;

  buildOptions(inputOptions: string[]): OptionRow[] {
    return inputOptions
      .filter((o) => o.trim())
      .map((text, i) => ({ text: text.trim(), order_index: i }));
  }

  validateDefinition(input: QuestionInput, humanIndex: number): void {
    const valid = input.options.filter((o) => o.trim());
    if (valid.length < 2) {
      throw new Error(`設問${humanIndex}は選択肢を2つ以上入力してください`);
    }
  }

  validateAnswer(answer: AnswerInput | undefined, questionText: string): void {
    if ((answer?.option_ids?.length ?? 0) !== 1) {
      throw new Error(`「${questionText}」に回答してください`);
    }
  }
}

/** 複数選択（チェックボックス） */
export class MultipleChoiceQuestion extends ChoiceQuestionBase {
  readonly type = 'multiple' as const;
  readonly label = '複数選択';
  readonly pointCost = 1.0;
  readonly requiresOptionInput = true;

  buildOptions(inputOptions: string[]): OptionRow[] {
    return inputOptions
      .filter((o) => o.trim())
      .map((text, i) => ({ text: text.trim(), order_index: i }));
  }

  validateDefinition(input: QuestionInput, humanIndex: number): void {
    const valid = input.options.filter((o) => o.trim());
    if (valid.length < 2) {
      throw new Error(`設問${humanIndex}は選択肢を2つ以上入力してください`);
    }
  }

  validateAnswer(answer: AnswerInput | undefined, questionText: string): void {
    if ((answer?.option_ids?.length ?? 0) < 1) {
      throw new Error(`「${questionText}」に回答してください`);
    }
  }
}

/** スケール（5段階）。選択肢はユーザー入力せず1〜5を自動生成する。 */
export class ScaleQuestion extends ChoiceQuestionBase {
  readonly type = 'scale' as const;
  readonly label = 'スケール（5段階）';
  readonly pointCost = 0.5;
  readonly requiresOptionInput = false;

  buildOptions(): OptionRow[] {
    return ['1', '2', '3', '4', '5'].map((text, i) => ({ text, order_index: i }));
  }

  validateDefinition(): void {
    // スケールは選択肢を自動生成するため、定義時の追加バリデーションは不要
  }

  validateAnswer(answer: AnswerInput | undefined, questionText: string): void {
    if ((answer?.option_ids?.length ?? 0) !== 1) {
      throw new Error(`「${questionText}」に回答してください`);
    }
  }
}
