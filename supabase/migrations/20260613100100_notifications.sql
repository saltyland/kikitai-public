-- =============================================================
-- アプリ内通知センター＋ポイント保守バッチ（冪等）
--  1. notifications テーブル（RLS：閲覧/既読化は本人のみ。自分宛のみ作成可）
--  2. notify_user()            : SECURITY DEFINER の通知発行関数（他関数・バッチから使用）
--  3. point_lots.expiry_notified : 失効前通知の重複防止フラグ
--  4. run_points_maintenance() : 残高再同期＋失効14日前通知（Cronから実行）
-- =============================================================

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  -- 'survey_goal_reached' / 'points_low' / 'points_expiring' など
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamp with time zone default now()
);
create index if not exists notifications_user_idx on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

drop policy if exists "通知は本人のみ閲覧可" on notifications;
create policy "通知は本人のみ閲覧可" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "通知は本人のみ既読化可" on notifications;
create policy "通知は本人のみ既読化可" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 自分宛の通知のみクライアントから作成できる（例：公開失敗＝残高不足の自己通知）。
-- 他人宛はRLSで禁止し、notify_user（definer）経由でのみ発行する。
drop policy if exists "通知は自分宛のみ作成可" on notifications;
create policy "通知は自分宛のみ作成可" on notifications
  for insert with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 通知発行（SECURITY DEFINER）。他のDB関数・バッチからのみ使う想定のため、
-- クライアント（authenticated）には実行権限を与えない。
-- -------------------------------------------------------------
create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
returns void
language sql
security definer set search_path = public
as $$
  insert into notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

revoke execute on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;

-- 失効前通知の重複防止フラグ
alter table point_lots add column if not exists expiry_notified boolean not null default false;

-- -------------------------------------------------------------
-- ポイント保守バッチ（Vercel Cron から service_role で実行）：
--  (a) 全ユーザーの profiles.points を期限内ロット合計に再同期（放置による陳腐化対策）
--  (b) 14日以内に失効するロットを検出し、未通知なら 'points_expiring' を発行
-- 戻り値: {"synced_profiles": n, "notified_lots": n}
-- -------------------------------------------------------------
create or replace function public.run_points_maintenance()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_synced integer;
  v_notified integer := 0;
  v_lot record;
begin
  update profiles p
  set points = coalesce(
    (select sum(amount) from point_lots
     where user_id = p.id and expires_at > now()), 0)
  where p.points is distinct from coalesce(
    (select sum(amount) from point_lots
     where user_id = p.id and expires_at > now()), 0);
  get diagnostics v_synced = row_count;

  for v_lot in
    select id, user_id, amount, expires_at from point_lots
    where expires_at > now()
      and expires_at <= now() + interval '14 days'
      and not expiry_notified
    for update
  loop
    perform notify_user(
      v_lot.user_id,
      'points_expiring',
      'ポイントの有効期限が近づいています',
      v_lot.amount || 'pt が ' || to_char(v_lot.expires_at, 'YYYY-MM-DD') ||
        ' に失効します。アンケートの公開などでの利用をご検討ください。',
      '/profile'
    );
    update point_lots set expiry_notified = true where id = v_lot.id;
    v_notified := v_notified + 1;
  end loop;

  return jsonb_build_object('synced_profiles', v_synced, 'notified_lots', v_notified);
end;
$$;

revoke execute on function public.run_points_maintenance() from public, anon, authenticated;
