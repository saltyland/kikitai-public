-- =============================================================
-- 既存DBへの追加マイグレーション
-- 新規登録時のRLSエラー（new row violates row-level security policy for table "profiles"）
-- を解消するため、auth.usersへのINSERTトリガーでプロフィールを自動生成する。
-- Supabaseの SQL Editor でこのファイルの内容を実行してください。
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, affiliation, field)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), 'ユーザー'),
    nullif(new.raw_user_meta_data->>'affiliation', ''),
    nullif(new.raw_user_meta_data->>'field', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
