-- =============================================================
-- Googleフォーム相当の機能拡張（冪等）
--  - 設問タイプの追加（dropdown / paragraph / date / grid）
--  - 設問の必須化・説明文・タイプ別設定（config）・セクション所属
--  - アンケートのセクション（ページ）メタ情報
--  - グリッド設問の回答行ラベル
-- 既存DBに再実行しても安全なよう add column if not exists 等で構成する。
-- =============================================================

-- 設問：必須・説明文・タイプ別設定・セクション番号
alter table questions add column if not exists required boolean not null default false;
alter table questions add column if not exists description text;
alter table questions add column if not exists config jsonb;
alter table questions add column if not exists section_index integer not null default 0;

-- 設問タイプのチェック制約を拡張（dropdown / paragraph / date / grid / attention を許可）。
-- attention は後続マイグレーション（quality_rewards）で追加される型だが、
-- sync は全マイグレーションを毎回リプレイするため、ここで一時的に絞ると
-- 既存データ（attention型の行）に違反して失敗する。最終形を先取りして書く。
alter table questions drop constraint if exists questions_type_check;
alter table questions add constraint questions_type_check
  check (type in ('single', 'multiple', 'dropdown', 'text', 'paragraph', 'date', 'scale', 'grid', 'attention'));

-- アンケート：セクション（ページ）メタ情報。配列の各要素が1ページ分の {title, description}。
-- 空配列は「セクションなし（単一ページ）」を表す。
alter table surveys add column if not exists sections jsonb not null default '[]'::jsonb;

-- 個別回答：グリッド設問の行ラベル（行ごとに選択列を1行として保存する）
alter table answers add column if not exists row_label text;
