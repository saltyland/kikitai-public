-- =============================================================
-- 仕様変更（2026-06-25）：
--  1. 「属性を非公開にするとポイントボーナス」を廃止
--     - 既存の privacy_bonus ロットを削除し、全ユーザーの points を再同期する。
--     - 以後、公開/非公開は「自分のプロフィールに表示するかどうか」だけの設定になり、
--       ポイントには一切影響しない（属性記入の +30pt は onboarding 側で付与）。
--  2. アンケート結果の閲覧者には「回答内容＋属性」だけを渡す。
--     - 結果ページ（個別の回答）で回答者の属性を、プロフィール公開/非公開設定に
--       依らず常に表示するため、所有者だけが回答者の素の属性を読める
--       SECURITY DEFINER 関数を用意する（ニックネーム/アバター等の個人情報は渡さない）。
-- 既存DBに再実行しても安全（冪等）。
-- =============================================================

-- 1. 非公開ボーナスの撤去 -------------------------------------------------
delete from public.point_lots where reason = 'privacy_bonus';

-- 残高キャッシュを有効な束の合計に再同期（1文・lost update なし）
update public.profiles
set points = coalesce(
  (select sum(amount) from public.point_lots
   where user_id = profiles.id and expires_at > now()), 0);

-- 2. 結果ページ用：回答者属性の開示関数 ---------------------------------
-- アンケート所有者本人だけが、そのアンケートに回答したユーザーの素の属性
-- （非公開マスクなし）を取得できる。個人を特定しうる nickname/avatar/sns は返さない。
create or replace function public.survey_respondent_attributes(p_survey_id uuid)
returns table (
  user_id uuid,
  age integer,
  gender text,
  occupation text,
  grade text,
  major text,
  affiliation text,
  field text
)
language sql
security definer set search_path = public
as $$
  select p.id, p.age, p.gender, p.occupation, p.grade, p.major, p.affiliation, p.field
  from public.profiles p
  where exists (
    select 1
    from public.responses r
    join public.surveys s on s.id = r.survey_id
    where r.survey_id = p_survey_id
      and r.user_id = p.id
      and s.user_id = auth.uid()
  );
$$;

revoke execute on function public.survey_respondent_attributes(uuid) from public, anon;
grant execute on function public.survey_respondent_attributes(uuid) to authenticated;
