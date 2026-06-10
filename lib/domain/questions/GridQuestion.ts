import { QuestionTypeDefinition, type OptionRow } from './QuestionTypeDefinition';
import type {
  Answer,
  AnswerInput,
  GridConfig,
  QuestionAggregate,
  QuestionConfig,
  QuestionInput,
  QuestionWithOptions,
} from '@/lib/types/database';

/**
 * グリッド設問（選択式グリッド／チェックボックスグリッド）。
 * 行・列を config に保持し、回答は「行ごとに選択した列」を answers に
 * row_label=行ラベル, text_answer=列ラベル の行として保存する。
 * この型固有の直列化・集計をすべてこのクラスにカプセル化する。
 */
export class GridQuestion extends QuestionTypeDefinition {
  readonly type = 'grid' as const;
  readonly label = 'グリッド（選択式／チェックボックス）';
  readonly pointCost = 1.5;
  readonly requiresOptionInput = false;

  private resolveConfig(config: QuestionConfig | null): GridConfig {
    const c = (config ?? {}) as Partial<GridConfig>;
    return {
      rows: (c.rows ?? []).map((r) => r.trim()).filter(Boolean),
      columns: (c.columns ?? []).map((col) => col.trim()).filter(Boolean),
      multiple: !!c.multiple,
    };
  }

  buildOptions(): OptionRow[] {
    // グリッドの行・列は config に保持するため options は使わない
    return [];
  }

  buildConfig(input: QuestionInput): QuestionConfig {
    return this.resolveConfig(input.config);
  }

  validateDefinition(input: QuestionInput, humanIndex: number): void {
    const { rows, columns } = this.resolveConfig(input.config);
    if (rows.length < 1) throw new Error(`設問${humanIndex}は行を1つ以上入力してください`);
    if (columns.length < 2) throw new Error(`設問${humanIndex}は列を2つ以上入力してください`);
  }

  validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void {
    const { rows } = this.resolveConfig(question.config);
    const grid = answer?.grid_answers ?? [];
    const answeredRows = new Set(
      grid.filter((g) => g.columns.length > 0).map((g) => g.row)
    );
    if (question.required) {
      // 必須グリッドは全行に1つ以上の選択を要求する
      const missing = rows.some((r) => !answeredRows.has(r));
      if (missing) throw new Error(`「${question.text}」のすべての行に回答してください`);
    }
  }

  aggregate(question: QuestionWithOptions, answers: Answer[]): QuestionAggregate {
    const { rows, columns } = this.resolveConfig(question.config);
    const gridCounts: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      gridCounts[r] = {};
      columns.forEach((c) => (gridCounts[r][c] = 0));
    });
    for (const ans of answers) {
      if (ans.question_id !== question.id) continue;
      const row = ans.row_label;
      const col = ans.text_answer;
      if (row && col && gridCounts[row] && gridCounts[row][col] !== undefined) {
        gridCounts[row][col] += 1;
      }
    }
    return { question, optionCounts: {}, textAnswers: [], gridCounts };
  }

  renderAnswerText(answers: Answer[]): string {
    const byRow: Record<string, string[]> = {};
    for (const a of answers) {
      if (a.row_label && a.text_answer) {
        (byRow[a.row_label] ??= []).push(a.text_answer);
      }
    }
    return Object.entries(byRow)
      .map(([row, cols]) => `${row}: ${cols.join(',')}`)
      .join(' / ');
  }
}
