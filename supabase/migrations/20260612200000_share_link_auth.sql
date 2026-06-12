-- 共有リンクからのログイン済み回答 + 0ポイントオプション
-- 冪等（何度実行しても安全）

-- ① unlisted アンケートで「共有リンク回答を0ポイントにする」フラグを追加
alter table surveys
  add column if not exists share_link_no_reward boolean not null default false;

-- ② get_shared_survey RPC を更新して share_link_no_reward も返す
-- （戻り型を変更するため DROP → CREATE が必要）
drop function if exists get_shared_survey(text);
create or replace function get_shared_survey(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey surveys;
  v_questions json;
begin
  select * into v_survey
  from surveys
  where share_token = p_token
    and status = 'open';

  if not found then
    return null;
  end if;

  select json_agg(
    json_build_object(
      'id', q.id,
      'survey_id', q.survey_id,
      'type', q.type,
      'text', q.text,
      'description', q.description,
      'required', q.required,
      'config', q.config,
      'section_index', q.section_index,
      'order_index', q.order_index,
      'condition', q.condition,
      'options', (
        select json_agg(
          json_build_object(
            'id', o.id,
            'question_id', o.question_id,
            'text', o.text,
            'order_index', o.order_index
          ) order by o.order_index
        )
        from options o
        where o.question_id = q.id
      )
    ) order by q.order_index
  ) into v_questions
  from questions q
  where q.survey_id = v_survey.id;

  return json_build_object(
    'id', v_survey.id,
    'user_id', v_survey.user_id,
    'title', v_survey.title,
    'description', v_survey.description,
    'required_count', v_survey.required_count,
    'deadline', v_survey.deadline,
    'status', v_survey.status,
    'sections', v_survey.sections,
    'consent_text', v_survey.consent_text,
    'target_conditions', v_survey.target_conditions,
    'min_trust_score', v_survey.min_trust_score,
    'retention_until', v_survey.retention_until,
    'share_token', v_survey.share_token,
    'visibility', v_survey.visibility,
    'share_link_no_reward', v_survey.share_link_no_reward,
    'created_at', v_survey.created_at,
    'questions', coalesce(v_questions, '[]'::json)
  );
end;
$$;
