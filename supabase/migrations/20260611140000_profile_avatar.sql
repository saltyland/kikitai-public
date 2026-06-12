-- =============================================================
-- プロフィールのアバター画像対応
--  - profiles.avatar_url（公開URL文字列。未設定=null）を追加
--  - public な storage バケット 'avatars' を作成
--  - storage.objects に RLS：自分のフォルダ（先頭= user id）配下だけ書込可、読取は公開
-- 既存DBに再実行しても安全（if not exists / on conflict do nothing / drop policy if exists）。
-- =============================================================

-- アバター画像の公開URL（Supabase Storage の getPublicUrl の結果を保存する）
alter table profiles add column if not exists avatar_url text;

-- アバター用の公開バケット（無ければ作成）。public=true で誰でも閲覧できる。
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 公開読み取り（バケットが public でも、明示ポリシーを置いておく）
drop policy if exists "アバターは誰でも閲覧可" on storage.objects;
create policy "アバターは誰でも閲覧可" on storage.objects
  for select using (bucket_id = 'avatars');

-- 自分のフォルダ（パスの先頭セグメント= 自分のuser id）にのみアップロード可
drop policy if exists "アバターは本人のみアップロード可" on storage.objects;
create policy "アバターは本人のみアップロード可" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のアバターのみ差し替え可
drop policy if exists "アバターは本人のみ更新可" on storage.objects;
create policy "アバターは本人のみ更新可" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のアバターのみ削除可
drop policy if exists "アバターは本人のみ削除可" on storage.objects;
create policy "アバターは本人のみ削除可" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
