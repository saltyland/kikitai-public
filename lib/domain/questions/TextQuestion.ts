import { QuestionTypeDefinition, type OptionRow } from './QuestionTypeDefinition';
import type {
  Answer,
  AnswerInput,
  QuestionAggregate,
  QuestionWithOptions,
} from '@/lib/types/database';

/**
 * テキスト系（記述式・段落・日付）の共通親クラス。
 * いずれも text_answer に1つの文字列を保存し、集計は回答一覧として扱う。
 */
export abstract class FreeTextQuestion extends QuestionTypeDefinition {
  readonly requiresOptionInput = false;

  buildOptions(): OptionRow[] {
    return [];
  }

  validateDefinition(): void {
    // テキスト系は選択肢を持たないため追加バリデーションは不要
  }

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    this.enforceRequired(!!answer?.text_answer?.trim(), question);
  }

  aggregate(question: QuestionWithOptions, answers: Answer[]): QuestionAggregate {
    const textAnswers: string[] = [];
    for (const ans of answers) {
      if (ans.question_id === question.id && ans.text_answer) {
        textAnswers.push(ans.text_answer);
      }
    }
    return { question, optionCounts: {}, textAnswers };
  }

  renderAnswerText(answers: Answer[]): string {
    return answers.map((a) => a.text_answer ?? '').filter(Boolean).join(' ');
  }
}

/** 記述式（短文） */
export class ShortTextQuestion extends FreeTextQuestion {
  readonly type = 'text' as const;
  readonly label = '記述式（短文）';
  readonly pointCost = 1.0;
}

/** 段落（長文） */
export class ParagraphQuestion extends FreeTextQuestion {
  readonly type = 'paragraph' as const;
  readonly label = '段落（長文）';
  readonly pointCost = 2.0;
}

/** 日付 */
export class DateQuestion extends FreeTextQuestion {
  readonly type = 'date' as const;
  readonly label = '日付';
  readonly pointCost = 0.5;
}
