-- =============================================================
-- 新規登録時のプロフィール自動生成トリガー
-- アプリから profiles へ直接INSERTするとセッション未確立時にRLSで弾かれるため、
-- auth.users へのINSERTをトリガーにして SECURITY DEFINER 関数でプロフィールを作る。
-- ニックネーム等は signUp の options.data（user metadata）から受け取る。
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
