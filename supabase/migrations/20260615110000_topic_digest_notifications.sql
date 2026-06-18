-- =============================================================
-- 通知連動：フォロー中ユーザーのアンケート公開通知 + トピックダイジェスト（冪等）
--  1. publish_survey v3 : 公開直後、visibility='public'ならフォロワー全員に
--                         'followed_user_survey_published' 通知を一括INSERT
--  2. run_topic_digest() : フォロー中トピックの新着アンケートをまとめて
--                         'followed_topic_digest' 通知として発行（Cronから実行）
-- いずれもnotify_user同様SECURITY DEFINERで、notification_settingsで
-- 該当種別がOFF（false）のユーザーは除外する。
-- =============================================================

-- -------------------------------------------------------------
-- 1. アンケート公開 v3：v2の残高チェックに加え、公開直後に
--    visibility='public'ならフォロワー全員へ通知を一括INSERTする。
--    ループせず1本のINSERT ... SELECTで完結させる
--    （user_follows(followee_id)インデックスにより高速）。
-- -------------------------------------------------------------
create or replace function public.publish_survey(p_survey_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_survey record;
  v_min_cost integer;
  v_balance integer;
begin
  select * into v_survey from surveys where id = p_survey_id for update;
  if not found or v_survey.user_id <> auth.uid() then
    raise exception 'KIKITAI:NOT_OWNER:';
  end if;
  if v_survey.status <> 'draft' then
    raise exception 'KIKITAI:NOT_DRAFT:';
  end if;

  select ceil(greatest(1, coalesce(sum(question_point_cost(type)), 0)))::integer
  into v_min_cost
  from questions where survey_id = p_survey_id;

  select coalesce(sum(amount), 0) into v_balance
  from point_lots where user_id = auth.uid() and expires_at > now();

  if v_balance < v_min_cost then
    raise exception 'KIKITAI:INSUFFICIENT_POINTS:%:%', v_min_cost, v_balance;
  end if;

  update surveys set status = 'open' where id = p_survey_id;

  if v_survey.visibility = 'public' then
    insert into notifications (user_id, type, title, body, link)
    select uf.follower_id,
           'followed_user_survey_published',
           'フォロー中のユーザーがアンケートを公開しました',
           v_survey.title,
           '/surveys/' || v_survey.id
    from user_follows uf
    join profiles p on p.id = uf.follower_id
    where uf.followee_id = v_survey.user_id
      and coalesce((p.notification_settings->>'followed_user_survey_published')::boolean, true);
  end if;

  return 0;
end;
$$;

-- -------------------------------------------------------------
-- 2. トピックダイジェスト発行（Vercel Cronから1日1回実行）。
--    フォロー中トピックに紐づく公開中アンケートのうち、
--    前回ダイジェスト以降に作成された件数をユーザーごとに集計し、
--    1件以上あるユーザーにのみ通知を発行する。
--    戻り値: {"notified_users": n}
-- -------------------------------------------------------------
create or replace function public.run_topic_digest()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_row record;
  v_notified integer := 0;
begin
  for v_row in
    select p.id as user_id, count(distinct s.id) as new_count
    from profiles p
    join user_topic_follows utf on utf.user_id = p.id
    join survey_topics st on st.topic_id = utf.topic_id
    join surveys s on s.id = st.survey_id
      and s.status = 'open' and s.visibility = 'public'
      and s.created_at > coalesce(p.last_topic_digest_at, p.created_at)
      and s.user_id <> p.id
    where coalesce((p.notification_settings->>'followed_topic_digest')::boolean, true)
    group by p.id
    having count(distinct s.id) > 0
  loop
    perform notify_user(
      v_row.user_id,
      'followed_topic_digest',
      'フォロー中のトピックに新着アンケートがあります',
      v_row.new_count || '件の新着アンケートがあります',
      '/surveys'
    );
    v_notified := v_notified + 1;
  end loop;

  update profiles p
  set last_topic_digest_at = now()
  where exists (
    select 1 from user_topic_follows utf where utf.user_id = p.id
  );

  return jsonb_build_object('notified_users', v_notified);
end;
$$;
