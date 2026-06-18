# キキタイ｜Phase 1 デモ

学生・研究者が互いにアンケートに回答し合うP2P型学術アンケート交換プラットフォーム。
本リポジトリは要件定義v1（ログイン・ユーザー管理・アンケート作成・回答）のデモ実装です。

## 技術スタック

- Next.js 16（App Router / TypeScript / Turbopack）
- Tailwind CSS v4
- Supabase（PostgreSQL + Auth）
- ホスティング：Vercel（予定）

## アーキテクチャ

オブジェクト指向設計を採用し、UI・ビジネスロジック・DBアクセスを分離しています。

```
app/                       ページ（ルーティング）
  actions/                 サーバーアクション（フォーム送信の入口）
components/                UIコンポーネント
lib/
  supabase/                Supabaseクライアント（browser / server / proxy）
  repositories/            DBアクセス層（インターフェース＋実装）
  services/                ビジネスロジック層（クラスベース）
  types/                   型定義
proxy.ts                   認証ガード（旧middleware）
supabase/schema.sql        DBスキーマ＋RLSポリシー
```

- リポジトリ層は `I○○Repository` インターフェースと実装クラスに分離
- サービス層がリポジトリを組み合わせて業務ロジックを担う
- UIコンポーネントから直接DBアクセスしない
- 設定値は環境変数（`.env.local`）から取得（ハードコードなし）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、`.env.local.example` を参考に値を設定します。

```
# 必須
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# `npm run sync` で自動反映する場合に設定（任意）
SUPABASE_ACCESS_TOKEN=...   # https://supabase.com/dashboard/account/tokens
SUPABASE_DB_PASSWORD=...    # プロジェクト作成時のDBパスワード
```

### 3. DBスキーマの反映とメール設定（ワンコマンド）

DBスキーマは `supabase/migrations/` でバージョン管理しています。
`.env.local` に上記の `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` を入れたうえで:

```bash
npm run sync
```

これだけで次の2つが自動実行されます。

1. **メール確認をOFF（自動確認）に設定** … 新規登録時の `email rate limit exceeded`
   を解消（確認メールを送らず、登録後すぐログイン状態になる）
2. **マイグレーションの反映** … `supabase/migrations/` のスキーマをリモートDBへ反映
   - `SUPABASE_DB_PASSWORD` があれば `supabase db push`（差分のみ正攻法で適用）
   - 無ければ **Management API でマイグレーションSQLを直接実行**（`SUPABASE_ACCESS_TOKEN`
     だけで反映可能。マイグレーションは冪等に書く運用のため再実行も安全）

以降、SQLを変えたら `supabase/migrations/` にファイルを足して `npm run sync`
（DBだけなら `npm run db:push`）。新しいマイグレーションの雛形は `npm run db:new <name>`。

> マイグレーションは冪等（再実行しても安全）です。既存DBに対して反映してもエラーになりません。

#### 手動で行う場合（CLIを直接使う）

```bash
npx supabase login                                 # ブラウザ認証
npx supabase link --project-ref <project-ref>
npx supabase db push
```
メール確認OFFは Authentication → Sign In/Providers → Email の「Confirm email」を
ダッシュボードでオフにしても同じです。

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 を開きます。未ログイン時は `/login` にリダイレクトされます。

## 実装済み機能（Phase 1）

- 認証：新規登録 / ログイン / ログアウト / 未ログイン時リダイレクト
- ユーザー管理：プロフィール編集 / 退会
- ホーム：作成したアンケート一覧（回答数・ステータス・状態変更・削除）
- アンケート作成・編集（Googleフォーム相当）：
  ラジオ/チェックボックス/プルダウン/記述式(短文)/段落(長文)/日付/スケール(可変・両端ラベル)/
  グリッド(選択式・チェックボックス) の設問、設問の必須化・説明文、セクション(ページ分割)、
  ドラッグ&ドロップ並べ替え・複製、下書き/公開/終了
- アンケート回答：公開中一覧（自作・回答済みを除外）、同意画面、セクション送り＋進捗バー、
  必須バリデーション、回答送信、重複防止
- 結果確認：回答数・集計グラフ・グリッドのクロス集計・CSVダウンロード（作成者のみ閲覧可）
