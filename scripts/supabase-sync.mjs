// =============================================================
// Supabase 同期スクリプト（ワンコマンド自動化）
//
//   npm run sync
//
// やること:
//   1. リモートの認証設定を「メール確認OFF（自動確認）」にする
//      → 新規登録時の "email rate limit exceeded" を解消（確認メールを送らない）
//   2. supabase/migrations/ のスキーマをリモートDBに反映（supabase db push）
//
// 必要な環境変数（.env.local に記載。gitignore済みなのでコミットされません）:
//   NEXT_PUBLIC_SUPABASE_URL   … 既存（プロジェクト参照を自動抽出）
//   SUPABASE_ACCESS_TOKEN      … https://supabase.com/dashboard/account/tokens で発行
//   SUPABASE_DB_PASSWORD       … プロジェクト作成時のDBパスワード
// =============================================================

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** .env.local を読み込んで process.env に反映（簡易パーサ） */
function loadEnvLocal() {
  const path = join(root, '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!url) {
  console.error('✖ NEXT_PUBLIC_SUPABASE_URL が .env.local にありません。');
  process.exit(1);
}

// https://<ref>.supabase.co → ref
const ref = new URL(url).hostname.split('.')[0];
console.log(`▶ プロジェクト参照: ${ref}`);

function run(cmd, extraEnv = {}) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: true,
  });
}

// -------------------------------------------------------------
// 1. メール確認OFF（リモート認証設定）— Management API
// -------------------------------------------------------------
async function disableEmailConfirmation() {
  if (!accessToken) {
    console.warn(
      '⚠ SUPABASE_ACCESS_TOKEN が未設定のため、メール確認OFFの自動化をスキップします。\n' +
        '   → ダッシュボード Authentication → Sign In/Providers → Email の "Confirm email" を手動でOFFにしてください。'
    );
    return;
  }
  console.log('▶ リモートのメール確認を自動確認（OFF）に設定中…');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    // mailer_autoconfirm=true で確認メールを送らず即時確認扱いにする
    body: JSON.stringify({ mailer_autoconfirm: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`認証設定の更新に失敗しました (${res.status}): ${body}`);
  }
  console.log('✔ メール確認をOFFにしました（以後の登録で確認メールは送られません）。');
}

// -------------------------------------------------------------
// 2. DBスキーマを反映
//    - DBパスワードがあれば supabase db push（差分のみ正攻法で適用）
//    - 無ければ Management API でマイグレーションSQLを直接実行（冪等前提のフォールバック）
//      ※ マイグレーションは冪等（再実行安全）に書く運用なのでAPI実行でも問題ない
// -------------------------------------------------------------
function pushWithCli() {
  const env = { SUPABASE_ACCESS_TOKEN: accessToken };
  console.log('▶ プロジェクトとリンク中…');
  run(`npx supabase link --project-ref ${ref} --password "${dbPassword}"`, env);
  console.log('▶ マイグレーションを反映中（db push）…');
  run(`npx supabase db push --password "${dbPassword}"`, env);
  console.log('✔ DBスキーマを反映しました（db push）。');
}

/** PostgRESTのスキーマキャッシュをリロードする。
 *  Management APIでマイグレーションを直接実行した場合、PostgRESTが古いスキーマを
 *  キャッシュしたままになり「column does not exist」が出続けることがあるため必須。 */
async function reloadSchemaCache() {
  await runSqlViaApi("NOTIFY pgrst, 'reload schema';");
  console.log('✔ PostgREST のスキーマキャッシュをリロードしました。');
}

/** Management API のクエリエンドポイントでSQLを実行する（DBパスワード不要） */
async function runSqlViaApi(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL実行に失敗しました (${res.status}): ${body}`);
  }
}

async function pushWithApi() {
  const migDir = join(root, 'supabase', 'migrations');
  if (!existsSync(migDir)) {
    console.warn('⚠ supabase/migrations が見つかりません。反映をスキップします。');
    return;
  }
  const files = readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // タイムスタンプ接頭辞順＝適用順
  if (files.length === 0) {
    console.warn('⚠ マイグレーションSQLがありません。');
    return;
  }
  console.log(
    '▶ SUPABASE_DB_PASSWORD 未設定 → Management API でマイグレーションを反映します（冪等）…'
  );
  for (const f of files) {
    const sql = readFileSync(join(migDir, f), 'utf8');
    process.stdout.write(`   • ${f} … `);
    await runSqlViaApi(sql);
    console.log('OK');
  }
  console.log('✔ DBスキーマを反映しました（Management API）。');
  await reloadSchemaCache();
}

async function pushDatabase() {
  if (!accessToken) {
    console.warn('⚠ SUPABASE_ACCESS_TOKEN 未設定のため DB反映をスキップします。');
    return;
  }
  if (dbPassword) {
    pushWithCli();
  } else {
    await pushWithApi();
  }
}

try {
  await disableEmailConfirmation();
  await pushDatabase();
  console.log('\n✅ 同期が完了しました。');
} catch (e) {
  console.error(`\n✖ エラー: ${e.message}`);
  process.exit(1);
}
