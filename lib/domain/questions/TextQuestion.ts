import { QuestionTypeDefinition, type OptionRow } from './QuestionTypeDefinition';
import type {
  Answer,
  AnswerInput,
  QuestionAggregate,
  QuestionInput,
  QuestionWithOptions,
} from '@/lib/types/database';

/** 自由記述 */
export class TextQuestion extends QuestionTypeDefinition {
  readonly type = 'text' as const;
  readonly label = '自由記述';
  readonly pointCost = 2.0;
  readonly requiresOptionInput = false;

  buildOptions(): OptionRow[] {
    return [];
  }

  validateDefinition(): void {
    // 自由記述は選択肢を持たないため追加バリデーションは不要
  }

  validateAnswer(answer: AnswerInput | undefined, questionText: string): void {
    if (!answer?.text_answer?.trim()) {
      throw new Error(`「${questionText}」に回答してください`);
    }
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
}
