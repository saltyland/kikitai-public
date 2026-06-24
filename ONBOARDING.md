# キキタイ 開発オンボーディングガイド

> 新しくチームに加わったメンバーはこのドキュメントを最初に読んでください。  
> セットアップ完了までの目安：**30〜45分**

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [必要なツールのインストール](#2-必要なツールのインストール)
3. [リポジトリのクローンと初期設定](#3-リポジトリのクローンと初期設定)
4. [環境変数の設定](#4-環境変数の設定)
5. [開発サーバーの起動確認](#5-開発サーバーの起動確認)
6. [チームの開発ポリシー](#6-チームの開発ポリシー)
7. [ブランチ・PR 運用ルール](#7-ブランチpr-運用ルール)
8. [よくある落とし穴](#8-よくある落とし穴)
9. [チェックリスト](#9-チェックリスト)

---

## 1. プロジェクト概要

**キキタイ** は学生・研究者が相互にアンケートを調査し合えるプラットフォームです。  
アンケートに答えるとポイントが貯まり、そのポイントで他者のアンケートを依頼できます。  
AI（LLM）がアンケートの品質を自動評価し、ポイントの付与・コストを決定します。

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16 / React 19 / TypeScript |
| スタイリング | Tailwind CSS v4 |
| BaaS | Supabase（認証・DB・ストレージ） |
| リポジトリ | https://github.com/TakatoGokyu/softwareA-prac |

---

## 2. 必要なツールのインストール

### 2-1. Node.js

1. https://nodejs.org/en/download から **LTS版** をダウンロードしてインストール
2. インストール後、ターミナルで確認：

```powershell
node -v   # v20.x 以上
npm -v    # v10.x 以上
```

> **Windows の注意**：PowerShell でコマンドが見つからない場合は、先頭に以下を実行してください。
>
> ```powershell
> $env:Path = "C:\Program Files\nodejs;" + $env:Path
> ```

### 2-2. Git

1. https://git-scm.com/download/win からインストール
2. インストール後、ユーザー情報を設定（**必須**）：

```bash
git config --global user.name  "あなたの名前"
git config --global user.email "あなたのGitHubメールアドレス"
```

3. 確認：

```bash
git --version   # git version 2.x
```

### 2-3. GitHub アカウントと SSH 設定

1. https://github.com でアカウントを作成（既存ならスキップ）
2. リポジトリオーナー（TakatoGokyu）に **Collaborator 招待** を依頼してください
3. 招待メールの Accept リンクをクリック

#### SSH キーの設定（推奨）

```bash
# SSH キーを生成
ssh-keygen -t ed25519 -C "あなたのGitHubメールアドレス"

# 公開鍵をコピー（Windows）
cat ~/.ssh/id_ed25519.pub
```

コピーした内容を GitHub → Settings → SSH and GPG keys → New SSH key に貼り付けてください。

### 2-4. GitHub CLI（オプションだが推奨）

PR 作成を CLI から行えて便利です。

```bash
winget install GitHub.cli   # または https://cli.github.com/
gh auth login
```

---

## 3. リポジトリのクローンと初期設定

```bash
# 1. クローン
git clone https://github.com/TakatoGokyu/softwareA-prac.git
cd softwareA-prac/kikitai

# 2. 依存パッケージをインストール
npm install
```

---

## 4. 環境変数の設定

`.env.local` はGit管理外のため、**各自で手動作成**する必要があります。

```bash
# .env.local.example をコピー
cp .env.local.example .env.local
```

次に `.env.local` を開いて、Supabase の値を埋めてください。  
**値はチームの共有手段（Notion / DM）で別途共有されます。リーダーに確認してください。**

```env
# --- アプリ実行に必須 ---
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# --- サーバー専用（絶対に公開しない）---
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# --- DB 反映スクリプト用（任意）---
SUPABASE_ACCESS_TOKEN=your_personal_access_token
SUPABASE_DB_PASSWORD=your_database_password
```

> ⚠️ `.env.local` は絶対に `git add` しないでください。`.gitignore` で除外済みですが二重確認を。

---

## 5. 開発サーバーの起動確認

```bash
# kikitai/ ディレクトリで実行
npm run dev
```

ブラウザで http://localhost:3000 を開き、トップページが表示されれば OK です。

### その他のコマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | Lint チェック |
| `npm test` | テスト実行（Vitest） |
| `npm run sync` | Supabase へ DB マイグレーション反映 |
| `npm run db:new -- <name>` | 新規マイグレーションファイル作成 |

---

## 6. チームの開発ポリシー

### 6-1. 必読ファイル（毎セッション開始時）

| ファイル | 内容 |
|---|---|
| `CLAUDE.md` | AI エージェント向けルール・SOP（作業フローの基準） |
| `AGENTS.md` | Next.js 固有の注意事項 |
| `引継ぎ.md` | 直近の作業状況・未対応 TODO・落とし穴（最重要） |

**新しい作業を始める前に必ず `引継ぎ.md` を読んでください。**  
作業後は、変更内容を `引継ぎ.md` に反映して冒頭の「最終更新」日付を更新してください。

### 6-2. コーディング規約

- 言語：**TypeScript 必須**（`any` の使用は最小限に）
- スタイル：**Tailwind CSS v4** のみ使用（インラインスタイルや CSS モジュールは原則禁止）
- コンポーネント：`components/` に配置、1ファイル1コンポーネントを基本とする
- 非同期：Next.js 16 の `cookies()` / `params` / `searchParams` はすべて `await` が必要
- DB マイグレーション：**冪等に書くこと**（`ADD COLUMN IF NOT EXISTS` 等）

### 6-3. コミットメッセージ

**日本語で簡潔に**書いてください。

```
feat: アンケート回答ページの UI を実装
fix: ポイント計算のバグを修正
chore: 依存パッケージを更新
```

AI（Claude）と共同作業した場合はコミット末尾に以下を追加：

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

### 6-4. 検証フロー（PR 前に必ず実施）

```bash
npx tsc --noEmit   # 型チェック
npm run lint       # Lint
npm test           # テスト
# 大きな変更の場合は npm run build も実行
```

---

## 7. ブランチ・PR 運用ルール

### ブランチ命名規則

```
feature/<機能名>   # 新機能
feat/<機能名>      # 同上（短縮形）
fix/<バグ名>       # バグ修正
chore/<作業内容>   # メンテナンス
```

例：`feature/survey-answer-form` / `fix/point-calculation-bug`

### 基本フロー

```bash
# 1. main から最新を取得
git checkout main
git pull origin main

# 2. 作業ブランチを作成
git checkout -b feature/your-feature

# 3. 作業・コミット
git add .
git commit -m "feat: 〜を実装"

# 4. プッシュ
git push origin feature/your-feature

# 5. PR を作成（GitHub の UI または CLI）
gh pr create --title "feat: 〜を実装" --body "変更内容の説明"
```

### PR のルール

- **一定の変更があったら必ず PR を出す**（大きすぎる PR は避ける）
- PR タイトル・本文は **日本語**
- レビュー依頼は PR を出した後に Slack / LINE で通知する
- `main` への直接 push は禁止
- マージ後は作業ブランチを削除する

---

## 8. よくある落とし穴

### Node が PowerShell で見つからない

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

セッションをまたいで設定したい場合はシステム環境変数に追加してください。

### `.env.local` の文字コード

UTF-8（BOM なし）で保存してください。BOM ありだと Supabase 接続エラーが起きます。

### Next.js 16 の非同期 API

```typescript
// ❌ 古い書き方
const cookieStore = cookies()

// ✅ Next.js 16 以降
const cookieStore = await cookies()
```

`params` / `searchParams` も同様に `await` が必要です。

### マイグレーションは冪等に

```sql
-- ❌ 再実行でエラー
ALTER TABLE surveys ADD COLUMN quality_score int;

-- ✅ 冪等
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS quality_score int;
```

---

## 9. チェックリスト

セットアップが完了したら以下をすべて確認してください。

- [ ] Node.js v20+ がインストールされている
- [ ] Git がインストールされ、`user.name` と `user.email` が設定されている
- [ ] GitHub アカウントを作成し、リポジトリへの招待を受け入れた
- [ ] リポジトリをクローンし `npm install` が成功した
- [ ] `.env.local` を作成し、Supabase の値を設定した
- [ ] `npm run dev` で http://localhost:3000 が表示された
- [ ] `npx tsc --noEmit` がエラーなし
- [ ] `引継ぎ.md` を読んで現在の状況を把握した
- [ ] 自分のブランチを作成して最初のコミットをプッシュできた

---

> 問題が発生した場合はチームの Slack / LINE で相談してください。  
> 最終更新：2026-06-17
