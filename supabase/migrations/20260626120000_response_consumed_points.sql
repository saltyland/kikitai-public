-- =============================================================
-- 回答1件ごとに「作成者が消費したポイント」を記録する（冪等）
--  - responses.consumed_points : その回答により作成者の残高から消費された
--    実ポイント数（残高不足時は consume_points_upto が消費できた分のみ）。
--    アンケート管理画面で「平均何ポイント／合計何ポイント消費したか」を
--    集計するために保存する。
--  - submit_survey_response v4 : v3 と同一だが、consume_points_upto の戻り値
--    （実消費額）を responses.consumed_points に書き戻す点だけを追加。
-- ※ シグネチャ (uuid, jsonb, integer, integer, integer) は v3 から変更しない。
-- =============================================================

alter table responses
  add column if not exists consumed_points integer not null default 0;

create or replace function public.submit_survey_response(
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
  v_consumed integer := 0;
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
    -- 実消費額を回答に記録し、管理画面でのポイント消費集計に使う。
    v_consumed := consume_points_upto(v_survey.user_id, v_award);
    update responses set consumed_points = v_consumed where id = v_response_id;
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

revoke execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) from public, anon;
grant execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) to authenticated;
