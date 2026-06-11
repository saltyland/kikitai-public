-- =============================================================
-- プロフィール属性の拡張＋ポイント／信頼スコア／非公開ボーナス（DESIGN_SPEC §3）
--  - 属性項目（age/gender/occupation/grade/major）を追加
--  - points（ポイント残高キャッシュ）/ trust_score（信頼スコア 0〜100, 既定70）
--  - private_fields（非公開にした属性名の配列。マッチング対象外＝逆インセンティブ）
--  - point_lots（ポイントの「束」。有効期限つきで付与し、期限切れは残高から外す）
-- 既存DBに再実行しても安全（add column if not exists / create table if not exists）。
-- =============================================================

-- 追加属性
alter table profiles add column if not exists age integer;
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists occupation text;
alter table profiles add column if not exists grade text;
alter table profiles add column if not exists major text;

-- ポイント残高（point_lots の非期限切れ合計をキャッシュ）
alter table profiles add column if not exists points integer not null default 0;

-- 信頼スコア（0〜100, 既定70）
alter table profiles add column if not exists trust_score integer not null default 70;
alter table profiles drop constraint if exists profiles_trust_score_check;
alter table profiles add constraint profiles_trust_score_check
  check (trust_score between 0 and 100);

-- 非公開にした属性名の配列（例: ["age","gender"]）。空配列＝すべて公開。
alter table profiles add column if not exists private_fields jsonb not null default '[]'::jsonb;

-- ポイントの束（有効期限つき）。available = expires_at が未来の amount 合計。
create table if not exists point_lots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount integer not null,
  -- 付与理由（'signup' / 'privacy_bonus' / 'answer_reward' など）
  reason text not null,
  granted_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null
);
create index if not exists point_lots_user_idx on point_lots (user_id);

alter table point_lots enable row level security;

drop policy if exists "ポイント束は本人のみ閲覧可" on point_lots;
create policy "ポイント束は本人のみ閲覧可" on point_lots
  for select using (auth.uid() = user_id);

drop policy if exists "ポイント束は本人のみ作成可" on point_lots;
create policy "ポイント束は本人のみ作成可" on point_lots
  for insert with check (auth.uid() = user_id);

drop policy if exists "ポイント束は本人のみ削除可" on point_lots;
create policy "ポイント束は本人のみ削除可" on point_lots
  for delete using (auth.uid() = user_id);

-- 新規登録ボーナス（+100pt / 有効期限180日）をトリガーで付与する。
-- 既存の handle_new_user を置き換え、profiles 生成と同時に signup ロットを作る。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, affiliation, field, points)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), 'ユーザー'),
    nullif(new.raw_user_meta_data->>'affiliation', ''),
    nullif(new.raw_user_meta_data->>'field', ''),
    100
  );
  insert into public.point_lots (user_id, amount, reason, expires_at)
  values (new.id, 100, 'signup', now() + interval '180 days');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
