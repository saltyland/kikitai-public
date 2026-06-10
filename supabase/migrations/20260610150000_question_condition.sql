-- =============================================================
-- 条件付き表示（分岐ロジック）
--  設問に「表示条件」を持たせる。特定の先行設問で指定の選択肢が選ばれた時だけ
--  この設問を表示する。condition は jsonb で次の形：
--    { "sourceQuestionOrder": <先行設問のorder_index>, "optionText": "<必要な選択肢テキスト>" }
--  null の場合は無条件で常に表示。
-- 既存DBに再実行しても安全（add column if not exists）。
-- =============================================================

alter table questions add column if not exists condition jsonb;
