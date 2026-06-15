import type { EvaluationItem } from './types';
import type { AnswerInput } from '@/lib/types/database';

// PII検出パターン（ローカルログ用）
const PII_PATTERNS: { name: string; re: RegExp; tag: string }[] = [
  {
    name: 'email',
    re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    tag: '[EMAIL]',
  },
  {
    name: 'phone',
    // 日本の電話番号（ハイフンあり/なし、国際形式 +81 含む）
    re: /(?:\+81[\s\-]?|0)\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{3,4}/g,
    tag: '[PHONE]',
  },
  {
    name: 'id',
    // 学籍番号・社員番号など「英字1〜4文字＋数字5〜10桁」形式の連番ID
    re: /\b[A-Za-z]{1,4}\d{5,10}\b/g,
    tag: '[ID]',
  },
  {
    name: 'url',
    // RFC 3986 の許容文字のみ（日本語等マルチバイト文字でURL終端）
    re: /https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g,
    tag: '[URL]',
  },
];

/** テキスト回答からPIIを置換する。検出ログはコンソールのみ（戻り値には残さない）。 */
function scrubText(text: string): string {
  let result = text;
  for (const { name, re, tag } of PII_PATTERNS) {
    const matches = result.match(re);
    if (matches) {
      console.log(`[sanitize] PII detected: type=${name} count=${matches.length}`);
      result = result.replace(re, tag);
    }
  }
  return result;
}

/** AnswerInput のうち評価に必要な値のみを持つ新オブジェクトを返す。 */
function sanitizeAnswer(answer: AnswerInput): AnswerInput {
  const out: AnswerInput = { question_id: answer.question_id };
  if (answer.option_ids !== undefined) {
    out.option_ids = answer.option_ids;
  }
  if (answer.text_answer !== undefined) {
    out.text_answer = scrubText(answer.text_answer);
  }
  if (answer.grid_answers !== undefined) {
    // grid の row/columns は設問構造由来（ユーザーフリーテキストでない）のためそのまま
    out.grid_answers = answer.grid_answers.map((ga) => ({
      row: ga.row,
      columns: [...ga.columns],
    }));
  }
  return out;
}

/**
 * 品質評価器に渡す前に EvaluationItem[] を脱識別する純関数（§5.1/5.2）。
 *
 * - ホワイトリスト再構築：設問文・タイプ・選択肢ラベル・回答値のみを持つ新オブジェクトを組み直す。
 *   ユーザーID・属性・IP・認証トークンはそもそも EvaluationItem の構造にないが、
 *   Question の survey_id 等の余分なメタデータも除去して最小化する。
 * - テキスト回答のPIIスクラブ：メール/電話/連番ID/URL を [TAG] に置換。
 * - 冪等：二重適用しても結果は変わらない。
 * - 外部通信なし：純粋な変換のみ。
 */
export function sanitizeItems(items: EvaluationItem[]): EvaluationItem[] {
  return items.map((item) => {
    const { question, answer, correctOptionText } = item;

    // 設問のホワイトリスト再構築（survey_id・condition・description 等を除去）
    const safeQuestion = {
      // id は評価器内部でのマッチングに必要なため保持
      id: question.id,
      survey_id: '',          // survey UUIDは評価不要なため空文字にする
      type: question.type,
      text: question.text,
      description: null,      // 不要
      required: question.required,
      config: question.config, // scale/attention の評価に必要
      section_index: question.section_index,
      order_index: question.order_index,
      condition: null,         // 評価時点では表示制御不要
      options: question.options.map((opt) => ({
        id: opt.id,            // AnswerInput.option_ids との照合に必要
        question_id: '',       // 評価では不要
        text: opt.text,        // 選択肢ラベルのみ
        order_index: opt.order_index,
      })),
    };

    const safeAnswer: AnswerInput | undefined =
      answer !== undefined ? sanitizeAnswer(answer) : undefined;

    const result: EvaluationItem = { question: safeQuestion, answer: safeAnswer };
    if (correctOptionText !== undefined) {
      result.correctOptionText = correctOptionText;
    }
    return result;
  });
}
