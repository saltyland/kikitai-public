-- profiles に birthday (date) カラムを追加する
-- age は birthday から計算してアプリ側で更新する（マッチング条件等で引き続き利用）
alter table public.profiles add column if not exists birthday date;

-- public_profiles ビューを再定義（birthday を追加）
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
  case when p.private_fields ? 'age'         then null else p.birthday    end as birthday,
  case when p.private_fields ? 'gender'      then null else p.gender      end as gender,
  case when p.private_fields ? 'occupation'  then null else p.occupation  end as occupation,
  case when p.private_fields ? 'grade'       then null else p.grade       end as grade,
  case when p.private_fields ? 'major'       then null else p.major       end as major,
  p.sns_links,
  p.created_at
from public.profiles p;

revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;
