-- =============================================================
-- unlisted（限定公開）アンケートはポイント不要
--   publish_survey v3: visibility = 'unlisted' の場合は残高チェックをスキップする。
--   回答送信時は share_link_no_reward = true（サービス層で強制）により
--   p_earned_points = 0 で呼ばれるため、作成者課金も発生しない。
-- =============================================================

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

  -- 限定公開（unlisted）はポイント無料のため残高チェック不要
  if v_survey.visibility <> 'unlisted' then
    select ceil(greatest(1, coalesce(sum(question_point_cost(type)), 0)))::integer
    into v_min_cost
    from questions where survey_id = p_survey_id;

    select coalesce(sum(amount), 0) into v_balance
    from point_lots where user_id = auth.uid() and expires_at > now();

    if v_balance < v_min_cost then
      raise exception 'KIKITAI:INSUFFICIENT_POINTS:%:%', v_min_cost, v_balance;
    end if;
  end if;

  update surveys set status = 'open' where id = p_survey_id;
  return 0;
end;
$$;
