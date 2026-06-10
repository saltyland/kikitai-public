@AGENTS.md
@引継ぎ.md

# 引継ぎファイルの運用（必須）

- セッション開始時に **`引継ぎ.md` を必ず読む**（上の `@引継ぎ.md` で自動読み込みされる）。
  そこに記載された前提・環境の落とし穴・Git/PR状況・未対応TODOを踏まえて作業する。
- 作業によって状況が変わったら、**その都度 `引継ぎ.md` を書き換える**こと。
  対象：機能・設計の変更、PRの作成/マージ、ブランチ変更、Supabase設定・環境変数・運用手順の変更、TODOの増減。
- 書き換えたら `引継ぎ.md` 冒頭の「最終更新」日付も更新する。

# 標準作業フロー（SOP・毎回これに従う）

ユーザーから指示を受けたら、原則として次の流れを **エージェント側で最後まで自動実行** する
（途中でユーザーに作業を投げ返さない。外部公開や破壊的操作の前だけ必要に応じ確認する）。

1. **読む**：`CLAUDE.md` → `@AGENTS.md` → `@引継ぎ.md` を読み、前提・落とし穴・PR状況・
   未対応TODOを把握する（上の2ファイルは自動読込）。
2. **作業する**：要件に沿って実装・修正する。環境の落とし穴を守る：
   - Node はPATH未設定。コマンド前に `$env:Path = "C:\Program Files\nodejs;" + $env:Path`。
   - 作業ディレクトリは `kikitai`（Next.jsプロジェクト直下）。
   - `.env.local` は UTF-8（BOMなし）。コミットしない。
   - Next.js 16 の非同期 `cookies()/params/searchParams`、middleware=`proxy.ts` に注意。
3. **検証する**：`npx tsc --noEmit` → `npm run lint` →（必要時）`npx next build` を通す。
4. **引継ぎを更新する**：`引継ぎ.md` を実態に合わせて書き換える。**古く不要になった記述・
   完了したTODOは削除/チェック済みに**して肥大化を防ぐ。冒頭「最終更新」日付も直す。
5. **Git/PR**：作業ブランチで `git commit`（末尾に `Co-Authored-By: Claude Opus 4.8
   <noreply@anthropic.com>`）→ `git push` → `gh pr create`（既存PRがあれば push のみ）。
   コミット/PR本文は日本語で簡潔に。`.env.local` は絶対に含めない。
6. **DB自動反映**：`supabase/migrations/` を変更した場合は **エージェントが `npm run sync` を
   実行** してリモートDBへ反映する（PATHを通し `kikitai` で実行）。
   - `npm run sync` は DBパスワード未設定でも **Management API でマイグレーションSQLを直接適用**
     する（`SUPABASE_ACCESS_TOKEN` だけで反映可能）。**マイグレーションは必ず冪等**に書く
     （`add column if not exists` 等）。再実行で壊れるSQLは書かない。
   - 反映後、必要なら新カラム/テーブルの存在をAPIクエリで確認する。
7. **出力する**：実施内容・検証結果・PRのURL・残課題を日本語でまとめて報告する。
   できたことは断定し、失敗・スキップはそのまま正直に書く。
