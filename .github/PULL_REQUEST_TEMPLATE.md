## 概要

<!-- 何を・なぜ変更したかを1〜3行で -->

## 変更内容

<!-- 箇条書き -->
-

## 関連 Issue

<!-- 例: Closes #12 -->

## 動作確認

<!-- 実際に確認した手順と結果 -->
-

## チェックリスト

- [ ] `npx tsc --noEmit` が通る
- [ ] `npm run lint` が通る
- [ ] `npm test` が通る
- [ ] `.env.local` や API キーを含んでいない
- [ ] DB スキーマを変更した場合、マイグレーションが冪等である
- [ ] `question_point_cost` を変更した場合、`lib/domain/questions/` の `pointCost` と同期した
- [ ] 環境変数を追加した場合、`.env.local.example` に追記した

## スクリーンショット

<!-- UI 変更がある場合。Before / After -->
