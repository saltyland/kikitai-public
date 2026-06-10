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

`.env.local` に Supabase の URL と anon key を設定します。

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. データベースの作成（Supabase CLI）

DBスキーマは `supabase/migrations/` でバージョン管理しています。
ダッシュボードへの手動コピペは不要で、CLIから反映します。

初回のみ（ログインとプロジェクト紐付け）:

```bash
npx supabase login                                    # ブラウザ認証
npx supabase link --project-ref <your-project-ref>    # ダッシュボードURLの project/<ここ>
```

スキーマをリモートDBに反映:

```bash
npx supabase db push
```

以降、`supabase/migrations/` にSQLファイルを追加して `npx supabase db push` するだけで
変更が反映されます。新しいマイグレーションは
`npx supabase migration new <name>` で雛形を作れます。

> マイグレーションは冪等（再実行しても安全）に書いてあるため、既に手動でテーブルを
> 作成済みのDBに対して `db push` してもエラーになりません。

### 4. メール確認の設定（任意）

デモを手早く試す場合は、Supabase の Authentication → Providers → Email で
「Confirm email」をオフにすると、登録後すぐにログイン状態になります。

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 を開きます。未ログイン時は `/login` にリダイレクトされます。

## 実装済み機能（Phase 1）

- 認証：新規登録 / ログイン / ログアウト / 未ログイン時リダイレクト
- ユーザー管理：プロフィール編集 / 退会
- ホーム：作成したアンケート一覧（回答数・ステータス・状態変更・削除）
- アンケート作成・編集：単一/複数/自由記述/スケールの設問、追加・削除・並び替え、下書き/公開/終了
- アンケート回答：公開中一覧（自作・回答済みを除外）、同意画面、回答送信、重複防止
- 結果確認：回答数・集計グラフ（作成者のみ閲覧可）
