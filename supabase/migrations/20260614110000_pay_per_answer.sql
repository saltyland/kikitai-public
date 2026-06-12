-- =============================================================
-- ポイント消費を「公開時一括」から「回答ごとの品質比例」へ変更（冪等）
--  1. consume_points_upto     : 残高の範囲内でFIFO消費（不足でもエラーにしない）
--  2. publish_survey v2       : 公開時はポイントを消費しない。
--                               最低残高（1回答分＝設問コスト合計）だけチェックする。
--  3. submit_survey_response v3: 回答者への付与額（品質スコアに応じて 0〜コスト×1.5）と
--                               同額を、その都度アンケート作成者から消費する。
--                               低品質回答ほど作成者のコストは安く、高品質ほど高い。
--                               作成者の残高が足りない場合は残高分だけ消費し、
--                               回答者への付与は満額行う（回答者を巻き込まない）。
--                               author_refund（高品質時の作成者還元）は本モデルと
--                               矛盾するため廃止。
-- ※ question_point_cost の単価表は lib/domain/questions/ の pointCost と同期を保つこと。
-- =============================================================

-- -------------------------------------------------------------
-- 残高の範囲内でのみ消費するFIFO消費。戻り値＝実際に消費したポイント。
-- 回答送信時の作成者課金に使う（不足を理由に回答送信を失敗させないため）。
-- -------------------------------------------------------------
create or replace function public.consume_points_upto(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  for v_lot in
    select id, amount from point_lots
    where user_id = p_user_id and expires_at > now()
    order by granted_at asc, id asc
    for update
  loop
    exit when v_remaining <= 0;
    if v_lot.amount <= v_remaining then
      delete from point_lots where id = v_lot.id;
      v_remaining := v_remaining - v_lot.amount;
    else
      update point_lots set amount = amount - v_remaining where id = v_lot.id;
      v_remaining := 0;
    end if;
  end loop;

  perform sync_points_balance(p_user_id);
  return p_amount - v_remaining;
end;
$$;

-- -------------------------------------------------------------
-- アンケート公開 v2：ポイントは消費しない（消費は回答ごとに行う）。
-- ただし無一文での回答集めを防ぐため、最低でも「1回答分（設問コスト合計）」の
-- 残高があることだけ確認する。戻り値は互換のため integer（常に0）。
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
  return 0;
end;
$$;

-- -------------------------------------------------------------
-- 回答送信RPC v3：
--   保存・回答者への報酬付与・信頼スコア・自動close（従来どおり）に加え、
--   付与額と同額を作成者から consume_points_upto で消費する（品質比例の都度課金）。
--   p_author_refund は廃止のため旧6引数シグネチャを drop して作り直す。
-- -------------------------------------------------------------
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer);
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer, integer);
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer, integer, integer);

create function public.submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb,
  p_earned_points integer,
  p_trust_delta integer,
  p_duration_sec integer default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_survey record;
  v_response_id uuid;
  v_base_cost integer;
  v_max_points integer;
  v_award integer;
  v_count integer;
  v_closed boolean := false;
begin
  select * into v_survey from surveys where id = p_survey_id for update;
  if not found then
    raise exception 'KIKITAI:NOT_FOUND:';
  end if;
  if v_survey.status <> 'open' then
    raise exception 'KIKITAI:NOT_OPEN:';
  end if;
  if v_survey.user_id = v_user_id then
    raise exception 'KIKITAI:OWN_SURVEY:';
  end if;

  begin
    insert into responses (survey_id, user_id, duration_sec)
    values (p_survey_id, v_user_id, p_duration_sec)
    returning id into v_response_id;
  exception when unique_violation then
    raise exception 'KIKITAI:ALREADY_RESPONDED:';
  end;

  insert into answers (response_id, question_id, option_id, text_answer, row_label)
  select
    v_response_id,
    (a->>'question_id')::uuid,
    nullif(a->>'option_id', '')::uuid,
    nullif(a->>'text_answer', ''),
    nullif(a->>'row_label', '')
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) as a;

  -- 基本コスト（API直叩き対策として上限をDB側でも強制する）
  select ceil(greatest(1, coalesce(sum(question_point_cost(type)), 0)))::integer
  into v_base_cost
  from questions where survey_id = p_survey_id;
  v_max_points := ceil(v_base_cost * 1.5)::integer;
  v_award := least(greatest(p_earned_points, 0), v_max_points);

  if v_award > 0 then
    -- 回答者への報酬付与
    insert into point_lots (user_id, amount, reason, expires_at)
    values (v_user_id, v_award, 'answer_reward', now() + interval '180 days');
    perform sync_points_balance(v_user_id);

    -- 作成者から同額を消費（品質比例の都度課金）。残高不足時は残高分のみ消費し、
    -- 回答送信自体は成功させる（回答者にペナルティを波及させない）。
    perform consume_points_upto(v_survey.user_id, v_award);
  end if;

  -- 信頼スコア更新（減点のみ許可・0〜100にクランプ）
  if p_trust_delta < 0 then
    update profiles
    set trust_score = greatest(0, least(100, trust_score + greatest(p_trust_delta, -10)))
    where id = v_user_id;
  end if;

  -- 必要回答数に到達したら自動で締め切り、設問者へ通知する
  select count(*) into v_count from responses where survey_id = p_survey_id;
  if v_count >= v_survey.required_count then
    update surveys set status = 'closed' where id = p_survey_id;
    v_closed := true;
    begin
      perform notify_user(
        v_survey.user_id,
        'survey_goal_reached',
        '目標回答数に到達しました',
        '「' || v_survey.title || '」が必要回答数に達したため自動で締め切られました。結果を確認できます。',
        '/surveys/' || p_survey_id || '/results'
      );
    exception when undefined_function then
      null; -- 通知基盤が未適用でも回答送信は成功させる
    end;
  end if;

  return jsonb_build_object('response_count', v_count, 'closed', v_closed);
end;
$$;

revoke execute on function public.consume_points_upto(uuid, integer) from public, anon;
grant execute on function public.consume_points_upto(uuid, integer) to authenticated;
revoke execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) from public, anon;
grant execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) to authenticated;
