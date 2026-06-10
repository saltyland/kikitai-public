import type {
  Answer,
  AnswerInput,
  Option,
  QuestionAggregate,
  QuestionConfig,
  QuestionInput,
  QuestionType,
  QuestionWithOptions,
} from '@/lib/types/database';

/** 保存用の選択肢行 */
export interface OptionRow {
  text: string;
  order_index: number;
}

/**
 * 設問タイプの振る舞いを定義する抽象親クラス。
 *
 * 設問タイプごとに異なる「選択肢の扱い」「設定(config)」「バリデーション」「集計」
 * 「CSV出力」「ポイントコスト」を、このクラスのサブクラスにカプセル化する。
 * これにより、新しい設問タイプの追加を、このディレクトリにクラスを1つ足して
 * レジストリに登録するだけで完結させる（開放閉鎖の原則）。
 */
export abstract class QuestionTypeDefinition {
  /** DBに保存する設問タイプ識別子 */
  abstract readonly type: QuestionType;
  /** UI表示用ラベル */
  abstract readonly label: string;
  /**
   * 1設問あたりのポイントコスト（要件定義v2.0のコスト表）。
   * Phase 4のポイントシステムでアンケート公開コスト算出に使用する。
   */
  abstract readonly pointCost: number;
  /** 作成者が選択肢テキストを入力する必要があるか（UIの出し分けに使用） */
  abstract readonly requiresOptionInput: boolean;

  /** 入力からDB保存用の選択肢行を生成する（選択肢を持たないタイプは空配列） */
  abstract buildOptions(input: QuestionInput): OptionRow[];

  /** 入力からDB保存用の設定(config)を生成する（設定を持たないタイプは null） */
  buildConfig(input: QuestionInput): QuestionConfig | null {
    void input;
    return null;
  }

  /** 作成時のバリデーション。問題があれば Error を投げる。 */
  abstract validateDefinition(input: QuestionInput, humanIndex: number): void;

  /** 回答時のバリデーション。未回答・不正があれば Error を投げる。 */
  abstract validateAnswer(answer: AnswerInput | undefined, question: QuestionWithOptions): void;

  /** この設問に対する回答群を集計する */
  abstract aggregate(question: QuestionWithOptions, answers: Answer[]): QuestionAggregate;

  /**
   * CSV出力用：ある1回答セッションの当該設問への回答（複数行になりうる）を
   * 1セルの文字列に整形する。
   */
  abstract renderAnswerText(answers: Answer[], question: QuestionWithOptions): string;

  /**
   * 「必須なのに未回答」を共通判定するヘルパ。
   * answered=false かつ required の場合のみ Error を投げる。
   */
  protected enforceRequired(answered: boolean, question: QuestionWithOptions): void {
    if (!answered && question.required) {
      throw new Error(`「${question.text}」に回答してください`);
    }
  }

  /** option_id から選択肢テキストを引く小ヘルパ */
  protected optionText(options: Option[], optionId: string | null): string {
    if (!optionId) return '';
    return options.find((o) => o.id === optionId)?.text ?? '';
  }
}
