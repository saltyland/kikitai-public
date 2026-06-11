import type { SurveyStatus } from '@/lib/types/database';

/**
 * アンケート状態遷移のステートマシン。
 *
 * 許可される遷移は draft→open（公開）と open→closed（締切）のみ。
 * closed→open の再オープン等は、既存の回答データとの整合性
 * （公開コストの二重消費・集計の混在）を壊すため禁止する。
 * DB側にも同じ遷移表のトリガー（enforce_survey_status_transition）があり、
 * 変更時は両方を同期させること。
 */
const ALLOWED_TRANSITIONS: Record<SurveyStatus, readonly SurveyStatus[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
};

const ALL_STATUSES: readonly SurveyStatus[] = ['draft', 'open', 'closed'];

export class SurveyStateMachine {
  /** 文字列が正しいステータス値かを判定する型ガード（無検証キャストの排除） */
  static isStatus(value: string): value is SurveyStatus {
    return (ALL_STATUSES as readonly string[]).includes(value);
  }

  static canTransition(from: SurveyStatus, to: SurveyStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  /** 許可されない遷移なら日本語メッセージの Error を投げる */
  static assertTransition(from: SurveyStatus, to: SurveyStatus): void {
    if (!SurveyStateMachine.canTransition(from, to)) {
      throw new Error(`この状態変更（${from} → ${to}）は許可されていません`);
    }
  }
}
