import type { QuestionType } from '@/lib/types/database';
import { QuestionTypeDefinition } from './QuestionTypeDefinition';
import {
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  ScaleQuestion,
} from './ChoiceQuestion';
import { TextQuestion } from './TextQuestion';

/**
 * 設問タイプのレジストリ。
 *
 * 新しい設問タイプ（順位付け・マトリクス等）を追加する場合は、
 * QuestionTypeDefinition を継承したクラスを作り、この配列に1行足すだけでよい。
 * サービス層・UI層はこのレジストリ経由でしか設問タイプを扱わないため、
 * 既存コードを変更せずに機能拡張できる（開放閉鎖の原則）。
 */
const DEFINITIONS: QuestionTypeDefinition[] = [
  new SingleChoiceQuestion(),
  new MultipleChoiceQuestion(),
  new TextQuestion(),
  new ScaleQuestion(),
];

const BY_TYPE: Record<QuestionType, QuestionTypeDefinition> = DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.type] = def;
    return acc;
  },
  {} as Record<QuestionType, QuestionTypeDefinition>
);

export class QuestionTypeRegistry {
  /** 設問タイプ定義を取得する */
  static get(type: QuestionType): QuestionTypeDefinition {
    const def = BY_TYPE[type];
    if (!def) throw new Error(`未対応の設問タイプです: ${type}`);
    return def;
  }

  /** 登録済みの全設問タイプ定義（UIのタイプ選択肢生成などに使用） */
  static all(): QuestionTypeDefinition[] {
    return DEFINITIONS;
  }
}
