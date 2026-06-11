-- =============================================================
-- AI評価の実効化＋報酬拡張（冪等）
--  1. responses.duration_sec      : 回答所要時間（不正回答検出に使用）
--  2. 設問タイプ 'attention'      : アテンションチェック専用設問（config に正解選択肢）
--  3. submit_survey_response v2   : duration 保存＋高品質時の設問者還元（author_refund）
-- ※ question_point_cost の単価表は lib/domain/questions/ の pointCost と同期を保つこと。
-- =============================================================

-- 回答所要時間（秒）。クライアント計測値のため参考値（NULL可）。
alter table responses add column if not exists duration_sec integer;

-- 設問タイプに attention を追加
alter table questions drop constraint if exists questions_type_check;
alter table questions add constraint questions_type_check
  check (type in ('single', 'multiple', 'dropdown', 'text', 'paragraph', 'date', 'scale', 'grid', 'attention'));

-- 単価表に attention を追加（単一選択と同じ 0.5）
create or replace function public.question_point_cost(p_type text)
returns numeric
language sql
immutable
as $$
  select case p_type
    when 'single'    then 0.5
    when 'dropdown'  then 0.5
    when 'scale'     then 0.5
    when 'date'      then 0.5
    when 'attention' then 0.5
    when 'multiple'  then 1.0
    when 'text'      then 1.0
    when 'paragraph' then 2.0
    when 'grid'      then 1.5
    else 1.0
  end;
$$;

-- -------------------------------------------------------------
-- 回答送信RPC v2：
--   既存（保存・報酬・信頼・自動close）に加えて
--   - p_duration_sec を responses.duration_sec に保存
--   - p_author_refund：高品質回答（×1.5）時に設問者へ消費コストの最大50%を還元
--   - 自動close時に notify_user で設問者へ通知（notify_user 未作成でも動くよう例外無視）
-- 引数が変わるため旧シグネチャは drop してから作り直す。
-- -------------------------------------------------------------
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer);
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer, integer, integer);

create function public.submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb,
  p_earned_points integer,
  p_trust_delta integer,
  p_duration_sec integer default null,
  p_author_refund integer default 0
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
  v_max_refund integer;
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
  v_max_refund := ceil(v_base_cost * 0.5)::integer;

  if p_earned_points > 0 then
    insert into point_lots (user_id, amount, reason, expires_at)
    values (v_user_id, least(p_earned_points, v_max_points), 'answer_reward',
            now() + interval '180 days');
    perform sync_points_balance(v_user_id);
  end if;

  -- 高品質回答時の設問者への還元（良質なアンケート設計のインセンティブ）
  if p_author_refund > 0 then
    insert into point_lots (user_id, amount, reason, expires_at)
    values (v_survey.user_id, least(p_author_refund, v_max_refund), 'author_refund',
            now() + interval '180 days');
    perform sync_points_balance(v_survey.user_id);
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

revoke execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer, integer) from public, anon;
grant execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer, integer) to authenticated;
