import type { PostgrestError } from '@supabase/supabase-js';

/**
 * DBエラーの共通処理。
 * Supabaseの生のエラーメッセージ（スキーマ名・SQL断片・制約名など）をそのまま
 * クライアントへ返すと内部情報の漏えいになるため、詳細はサーバーログにのみ出力し、
 * ユーザーへは一般化したメッセージを投げる。
 */
export function throwDbError(
  error: Pick<PostgrestError, 'message'> & { code?: string },
  context: string
): never {
  // DBトリガー（状態遷移・設問保護など）が投げるビジネスエラーは
  // 通常クエリ経由でもここに届くため、RPC同様に日本語メッセージへ変換する。
  if (/KIKITAI:/.test(error.message ?? '')) {
    throwBusinessError(error.message);
  }
  console.error(`[DB:${context}]`, error.code ?? '', error.message);
  throw new Error('データベースの操作に失敗しました');
}

/**
 * RPC（Postgres関数）が raise exception で返すビジネスエラー。
 * メッセージは 'KIKITAI:<CODE>:<詳細...>' 形式で、code で分岐できる。
 */
export class BusinessRuleError extends Error {
  constructor(
    readonly code: string,
    readonly details: string[],
    message: string
  ) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

/** ビジネスエラーコード → ユーザー向け日本語メッセージ */
const BUSINESS_MESSAGES: Record<string, (d: string[]) => string> = {
  INSUFFICIENT_POINTS: (d) =>
    `ポイントが不足しています（公開には最低 ${d[0]}pt（1回答分）が必要 / 残高: ${d[1]}pt）。他のアンケートに回答してポイントを貯めましょう。`,
  NOT_OWNER: () => '操作権限がありません',
  NOT_DRAFT: () => '下書きのアンケートのみ公開できます',
  NOT_FOUND: () => 'アンケートが見つかりません',
  NOT_OPEN: () => 'このアンケートは回答を受け付けていません',
  OWN_SURVEY: () => '自分のアンケートには回答できません',
  ALREADY_RESPONDED: () => 'すでに回答済みです。ページを再読み込みしてください。',
  INVALID_TRANSITION: (d) =>
    `この状態変更（${d[0]} → ${d[1]}）は許可されていません`,
  HAS_RESPONSES: () =>
    '回答が存在するアンケートの設問は変更・削除できません（回答データ保護のため）',
};

/** 'KIKITAI:CODE:詳細' 形式のメッセージを BusinessRuleError に変換して投げる */
function throwBusinessError(message: string | undefined): never {
  const m = /KIKITAI:([A-Z_]+):?(.*)/.exec(message ?? '');
  const code = m?.[1] ?? 'UNKNOWN';
  const details = m?.[2] ? m[2].split(':') : [];
  const toMessage = BUSINESS_MESSAGES[code];
  throw new BusinessRuleError(
    code,
    details,
    toMessage ? toMessage(details) : '操作を完了できませんでした'
  );
}

/**
 * RPCエラーを処理する共通関数。
 * 'KIKITAI:' 形式なら BusinessRuleError（日本語メッセージ付き）に変換して投げ、
 * それ以外は throwDbError と同じく一般化したエラーにする。
 */
export function throwRpcError(
  error: Pick<PostgrestError, 'message'> & { code?: string },
  context: string
): never {
  if (/KIKITAI:/.test(error.message ?? '')) {
    throwBusinessError(error.message);
  }
  throwDbError(error, context);
}
