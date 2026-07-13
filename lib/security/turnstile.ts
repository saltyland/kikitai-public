/**
 * Cloudflare Turnstile によるボット対策（サーバー側検証）。
 *
 * このモジュールは TURNSTILE_SECRET_KEY を参照するためサーバー専用。
 * サーバーアクション（'use server'）からのみ import すること。
 *
 * 匿名でアカウントを量産できる唯一の経路（デモ開始ボタン）を保護し、
 * 新規登録ボーナス目当ての自動化された大量アカウント作成（Sybil攻撃）を防ぐ。
 *
 * 環境変数（両方セットで有効化。未設定なら検証をスキップし従来どおり動作する）：
 *  - NEXT_PUBLIC_TURNSTILE_SITE_KEY : クライアントのウィジェット表示用（公開してよい）
 *  - TURNSTILE_SECRET_KEY           : サーバー検証用の機密値（絶対に公開しない）
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  /** キー未設定で検証をスキップした場合 true（開発・未導入環境） */
  skipped: boolean;
}

/**
 * Turnstile トークンを検証する。
 * - TURNSTILE_SECRET_KEY 未設定 → 検証スキップ（ok: true, skipped: true）。導入前でも動く。
 * - 設定済み → トークン必須。Cloudflare に問い合わせ、成功時のみ ok: true。
 *   （fail-closed：シークレットがあるのにトークンが空/不正なら必ず拒否する）
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, skipped: false };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      // 検証はユーザー操作をブロックするため、応答が無い場合は fail-closed に倒す
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true, skipped: false };
  } catch {
    // ネットワーク障害・タイムアウト時は安全側（拒否）に倒す
    return { ok: false, skipped: false };
  }
}

/** クライアントにウィジェットを出すべきか（サイトキーが設定されているか）。 */
export function isTurnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
