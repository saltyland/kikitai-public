-- =============================================================
-- 料金プラン（free / pro）
--  Proプラン加入者のみ「統計解析モード」を利用できる。
--  決済は本デモでは扱わず、ユーザー管理画面のトグルで加入/解約を切り替える。
-- 既存DBに再実行しても安全（add column if not exists）。
-- =============================================================

alter table profiles add column if not exists plan text not null default 'free';
alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check check (plan in ('free', 'pro'));
