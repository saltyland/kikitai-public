# コントリビューションガイド

> **本リポジトリは [Kikitai Source-Available License](LICENSE) のもとで公開しています。**
> 閲覧・レビュー・評価は自由に行っていただけますが、コードの再配布や
> 本コードに基づくサービスの運営には著作権者の許諾が必要です。
> 本ガイドは主にプロジェクトメンバー向けの開発手順書です。
> 外部の方からの Issue・改善提案は歓迎します（PR をご検討の場合は、
> ライセンス上の取り扱いを整理したいので事前に Issue でご相談ください）。

## 開発の流れ

1. `main` から feature ブランチを切る
2. 実装する
3. ローカルで検証する（下記）
4. PR を作成する（`--base main`）
5. CI がすべて緑になったらマージする

`main` への直接 push は行いません。

## ブランチ命名

| 接頭辞 | 用途 |
|---|---|
| `feat/` | 新機能 |
| `fix/` | バグ修正 |
| `refactor/` | 挙動を変えない内部改善 |
| `docs/` | ドキュメントのみ |
| `chore/` | 設定・依存関係・CI |
| `security/` | セキュリティ関連 |

例: `feat/survey-branch-condition`

## コミットメッセージ

`<type>(<scope>): <日本語の要約>` 形式。

```
feat(quality): 締切つきAI評価で回答採点を即時化
fix(points): 同時回答時の残高ずれを修正
docs: アーキテクチャ図を追加
```

## PR を出す前に

```bash
npx tsc --noEmit    # 型チェック
npm run lint        # Lint
npm test            # Vitest（234ケース）
npm run build       # 本番ビルド（必要に応じて）
```

CI でも同じ 4 つが実行されます。ローカルで通してから PR を出してください。

## DB スキーマを変更する場合

1. `npm run db:new <name>` で新しいマイグレーションファイルを作る
2. **必ず冪等に書く**（`add column if not exists` / `drop policy if exists → create` /
   関数は旧シグネチャを `drop if exists` してから `create`）
3. `npm run sync` でリモート DB に反映する
4. `question_point_cost` を変更した場合は `lib/domain/questions/` の `pointCost` も必ず同期する

冪等でないマイグレーションは再実行時にスキーマを壊します。詳細は [ADR-009](docs/ADR.md) を参照。

## 秘密情報の取り扱い

- `.env.local` は **絶対にコミットしない**（`.gitignore` 済み）
- API キー・トークンをコード内にハードコードしない
- 新しい環境変数を追加したら `.env.local.example` にも項目を追記する

## 設計上の約束

| ルール | 理由 |
|---|---|
| UI コンポーネントから DB を直接参照しない | 認可漏れとテスト困難を防ぐ |
| `lib/domain/` に外部 I/O を持ち込まない | 単体テストをモック無しで書けるようにする |
| 金額（ポイント）に関わる更新はアプリ層で read-modify-write しない | lost update を防ぐ。[ADR-004](docs/ADR.md) |
| 新しい設問タイプは `QuestionTypeDefinition` の実装として追加する | 各所の `switch` 分岐を増やさない |
