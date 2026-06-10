import type {
  Answer,
  AnswerInput,
  QuestionAggregate,
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
 * 設問タイプごとに異なる「選択肢の扱い」「バリデーション」「集計」「ポイントコスト」を
 * このクラスのサブクラスにカプセル化することで、新しい設問タイプ（順位付け・マトリクス等）
 * の追加を、このディレクトリにクラスを1つ足してレジストリに登録するだけで完結させる。
 *
 * - Phase 1：単一選択・複数選択・自由記述・スケール
 * - Phase 2（予定）：順位付け・マトリクス → 新しいサブクラスを追加するだけ
 * - Phase 4（予定）：ポイントシステム → pointCost をそのまま利用
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

  /** 入力された選択肢から、DB保存用の選択肢行を生成する */
  abstract buildOptions(inputOptions: string[]): OptionRow[];

  /** 作成時のバリデーション。問題があれば Error を投げる。 */
  abstract validateDefinition(input: QuestionInput, humanIndex: number): void;

  /** 回答時のバリデーション。未回答・不正があれば Error を投げる。 */
  abstract validateAnswer(answer: AnswerInput | undefined, questionText: string): void;

  /** この設問に対する回答群を集計する */
  abstract aggregate(question: QuestionWithOptions, answers: Answer[]): QuestionAggregate;
}
