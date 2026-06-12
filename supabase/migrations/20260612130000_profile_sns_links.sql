-- profiles に sns_links カラムを追加（SNSリンクのJSONオブジェクト）
alter table public.profiles
  add column if not exists sns_links jsonb not null default '{}';

-- public_profiles ビューを再作成（sns_links を追加）
-- 既存ビューを一旦削除してから再作成する（カラム追加はREPLACEでは不可）
drop view if exists public.public_profiles;

create view public.public_profiles
  with (security_invoker = false)
as
select
  p.id,
  p.nickname,
  p.avatar_url,
  case when p.private_fields ? 'affiliation' then null else p.affiliation end as affiliation,
  case when p.private_fields ? 'field'       then null else p.field       end as field,
  case when p.private_fields ? 'age'         then null else p.age         end as age,
  case when p.private_fields ? 'gender'      then null else p.gender      end as gender,
  case when p.private_fields ? 'occupation'  then null else p.occupation  end as occupation,
  case when p.private_fields ? 'grade'       then null else p.grade       end as grade,
  case when p.private_fields ? 'major'       then null else p.major       end as major,
  p.sns_links,
  p.created_at
from public.profiles p;

-- ビューの権限を再付与
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;
