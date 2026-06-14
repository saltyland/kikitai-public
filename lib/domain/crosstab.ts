import type { QuestionType, SurveyWithQuestions, UserResponse } from '@/lib/types/database';

/**
 * 設問間クロス集計（Proの「設問間の関係」分析用）。
 * 回答者ごとの選択肢を突き合わせ、行設問×列設問の同時度数表を作る。
 * 純粋関数のみ。UIや取得処理には依存しない。
 */

/** クロス集計の対象にできる設問タイプ（選択肢を持つもの） */
const CROSSABLE: ReadonlySet<QuestionType> = new Set([
  'single',
  'multiple',
  'dropdown',
  'scale',
  'attention',
]);

export function isCrossTabbable(type: QuestionType): boolean {
  return CROSSABLE.has(type);
}

/** クロス集計に使える設問（選択肢が1つ以上あるもの）だけ抽出 */
export function crossTabbableQuestions(survey: SurveyWithQuestions) {
  return survey.questions
    .map((q, index) => ({ q, index }))
    .filter(({ q }) => isCrossTabbable(q.type) && q.options.length > 0);
}

/** ある回答者がある設問で選んだ option_id の集合（複数選択は複数返る） */
export function selectedOptionIds(ur: UserResponse, questionId: string): string[] {
  return ur.answers
    .filter((a) => a.question_id === questionId && a.option_id)
    .map((a) => a.option_id as string);
}

export interface CrossTab {
  rowLabels: string[];
  colLabels: string[];
  /** matrix[r][c] = 行r・列c を同時に選んだ回答者数 */
  matrix: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  /** どちらかの設問に未回答だった回答者数（行・列の組に寄与しない） */
  excludedCount: number;
}

/** クロス集計表の行・列に使う選択肢（id/textのみ。サーバー/クライアント両方で使えるよう最小限） */
export interface CrossTabOption {
  id: string;
  text: string;
}

/** 1回答者の行設問・列設問それぞれの選択option_id */
export interface CrossTabSelection {
  row: string[];
  col: string[];
}

/**
 * 行・列の選択肢と回答者ごとの選択から同時度数表を作る純粋関数。
 * `buildCrossTab`（サーバー側・SurveyWithQuestions入力）と
 * `CrossTabExplorer`（クライアント側・シリアライズ済みデータ入力）の
 * 両方からこの関数を呼び、集計ロジックを1箇所にまとめる。
 *
 * - 単一選択系は1回答者につき1セルに加算。
 * - 複数選択は選んだ組み合わせ全てのセルに加算するため、合計は回答者数を上回りうる
 *   （grandTotal は「行・列とも回答した回答者の延べセル寄与数」）。
 * - 行・列いずれかが未回答の回答者は excludedCount に数え、表には含めない。
 */
export function crossTabFromSelections(
  rowOptions: CrossTabOption[],
  colOptions: CrossTabOption[],
  selections: CrossTabSelection[]
): CrossTab {
  const rowLabels = rowOptions.map((o) => o.text);
  const colLabels = colOptions.map((o) => o.text);
  const rowIndex = new Map(rowOptions.map((o, i) => [o.id, i]));
  const colIndex = new Map(colOptions.map((o, i) => [o.id, i]));

  const matrix = rowLabels.map(() => colLabels.map(() => 0));
  let excludedCount = 0;

  for (const { row: rows, col: cols } of selections) {
    if (rows.length === 0 || cols.length === 0) {
      excludedCount += 1;
      continue;
    }
    for (const rid of rows) {
      const ri = rowIndex.get(rid);
      if (ri === undefined) continue;
      for (const cid of cols) {
        const ci = colIndex.get(cid);
        if (ci === undefined) continue;
        matrix[ri][ci] += 1;
      }
    }
  }

  const rowTotals = matrix.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, ci) => matrix.reduce((a, r) => a + r[ci], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  return { rowLabels, colLabels, matrix, rowTotals, colTotals, grandTotal, excludedCount };
}

/**
 * 行設問×列設問のクロス集計表を作る（サーバー側・SurveyWithQuestions入力）。
 * 集計ロジック本体は `crossTabFromSelections` に委譲する。
 */
export function buildCrossTab(
  survey: SurveyWithQuestions,
  userResponses: UserResponse[],
  rowQuestionId: string,
  colQuestionId: string
): CrossTab | null {
  const rowQ = survey.questions.find((q) => q.id === rowQuestionId);
  const colQ = survey.questions.find((q) => q.id === colQuestionId);
  if (!rowQ || !colQ) return null;
  if (!isCrossTabbable(rowQ.type) || !isCrossTabbable(colQ.type)) return null;

  const selections = userResponses.map((ur) => ({
    row: selectedOptionIds(ur, rowQuestionId),
    col: selectedOptionIds(ur, colQuestionId),
  }));

  return crossTabFromSelections(rowQ.options, colQ.options, selections);
}

/**
 * クロス集計から Cramér's V（連関の強さ 0〜1）を求める。
 * 単一選択どうしの分析の目安。複数選択や疎な表では参考値。
 * 計算できない場合は null。
 */
export function cramersV(ct: CrossTab): number | null {
  const { matrix, rowTotals, colTotals, grandTotal } = ct;
  const n = grandTotal;
  const r = rowTotals.length;
  const k = colTotals.length;
  if (n === 0 || r < 2 || k < 2) return null;

  let chi2 = 0;
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < k; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected === 0) continue;
      chi2 += (matrix[i][j] - expected) ** 2 / expected;
    }
  }
  const denom = n * Math.min(r - 1, k - 1);
  if (denom <= 0) return null;
  return Math.sqrt(chi2 / denom);
}
