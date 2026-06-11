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
    `ポイントが不足しています（必要: ${d[0]}pt / 残高: ${d[1]}pt）。他のアンケートに回答してポイントを貯めましょう。`,
  NOT_OWNER: () => '操作権限がありません',
  NOT_DRAFT: () => '下書きのアンケートのみ公開できます',
  NOT_FOUND: () => 'アンケートが見つかりません',
  NOT_OPEN: () => 'このアンケートは回答を受け付けていません',
  OWN_SURVEY: () => '自分のアンケートには回答できません',
  ALREADY_RESPONDED: () => 'すでに回答済みです。ページを再読み込みしてください。',
};

/**
 * RPCエラーを処理する共通関数。
 * 'KIKITAI:' 形式なら BusinessRuleError（日本語メッセージ付き）に変換して投げ、
 * それ以外は throwDbError と同じく一般化したエラーにする。
 */
export function throwRpcError(
  error: Pick<PostgrestError, 'message'> & { code?: string },
  context: string
): never {
  const m = /KIKITAI:([A-Z_]+):?(.*)/.exec(error.message ?? '');
  if (m) {
    const code = m[1];
    const details = m[2] ? m[2].split(':') : [];
    const toMessage = BUSINESS_MESSAGES[code];
    throw new BusinessRuleError(
      code,
      details,
      toMessage ? toMessage(details) : '操作を完了できませんでした'
    );
  }
  throwDbError(error, context);
}
