import type { GridConfig, QuestionType, ScaleConfig } from '@/lib/types/database';
import { QuestionTypeRegistry } from './questions/registry';

/**
 * 編集中の設問（SurveyEditor の EditorQuestion）が満たすべき形を、
 * バリデーション用に最小限で表した型。SurveyEditor 側の EditorQuestion はこれを満たす。
 */
export interface EditorQuestionLike {
  key: string;
  type: QuestionType;
  text: string;
  options: string[];
  config: Partial<ScaleConfig & GridConfig>;
  condition: { sourceKey: string; optionText: string } | null;
}

/** 警告の重大度。error は公開を妨げ、warn は注意喚起のみ。 */
export type WarningLevel = 'error' | 'warn';

export interface QuestionWarning {
  level: WarningLevel;
  message: string;
}

function needsOptions(type: QuestionType) {
  return QuestionTypeRegistry.get(type).requiresOptionInput;
}

/**
 * 1設問分のバリデーション警告を算出する（設問単位の警告バッジ・公開時モーダルで使用）。
 * UI と公開ブロック判定の両方から呼べるよう、純粋関数として切り出している。
 *
 * @param q       検証対象の設問
 * @param byKey   key → 設問 の参照（条件元の存在チェックに使う）。省略可。
 */
export function validateEditorQuestion(
  q: EditorQuestionLike,
  byKey?: Map<string, EditorQuestionLike>
): QuestionWarning[] {
  const warnings: QuestionWarning[] = [];

  if (!q.text.trim()) {
    warnings.push({ level: 'error', message: '設問文が入力されていません' });
  }

  if (needsOptions(q.type)) {
    const filled = q.options.map((o) => o.trim()).filter(Boolean);
    if (filled.length < 2) {
      warnings.push({ level: 'error', message: '選択肢を2つ以上入力してください' });
    }
    if (q.options.some((o) => !o.trim())) {
      warnings.push({ level: 'warn', message: '空の選択肢があります' });
    }
    const dup = filled.length !== new Set(filled).size;
    if (dup) {
      warnings.push({ level: 'warn', message: '同じ選択肢が重複しています' });
    }
  }

  if (q.type === 'scale') {
    const min = q.config.min ?? 1;
    const max = q.config.max ?? 5;
    if (max <= min) {
      warnings.push({ level: 'error', message: '段階の最大値は最小値より大きくしてください' });
    }
  }

  if (q.type === 'grid') {
    const rows = (q.config.rows ?? []).map((r) => r.trim()).filter(Boolean);
    const cols = (q.config.columns ?? []).map((c) => c.trim()).filter(Boolean);
    if (rows.length === 0) warnings.push({ level: 'error', message: 'グリッドの行を1つ以上入力してください' });
    if (cols.length === 0) warnings.push({ level: 'error', message: 'グリッドの列を1つ以上入力してください' });
  }

  // 表示条件（分岐）の整合性
  if (q.condition && byKey) {
    const source = byKey.get(q.condition.sourceKey);
    if (!source) {
      warnings.push({ level: 'warn', message: '表示条件の参照先の設問が見つかりません' });
    } else if (!source.options.map((o) => o.trim()).includes(q.condition.optionText.trim())) {
      warnings.push({ level: 'warn', message: '表示条件で参照している選択肢が存在しません' });
    }
  }

  return warnings;
}

/** error レベルの警告が1件でもあれば true（公開ブロック判定に使用） */
export function hasBlockingWarning(warnings: QuestionWarning[]): boolean {
  return warnings.some((w) => w.level === 'error');
}
