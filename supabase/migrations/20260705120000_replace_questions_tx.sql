-- =============================================================
-- 設問の一括置換をトランザクション化（replace_questions RPC）
--   従来はアプリ層（surveyRepository.replaceQuestions）が
--   「全削除 → 設問ごとに逐次挿入」を複数の独立リクエストで実行しており、
--   削除成功後に挿入が途中で失敗すると設問0件の不正な状態になり得た
--   （docs/demo_review_fix_points.md FIX-12）。
--   本RPCは1トランザクション内で削除と挿入を行い、失敗時は全てロールバックする。
--
--   権限設計：
--   - security definer のため RLS は通らないが、所有者チェックを関数内で行う。
--   - 状態（draft のみ編集可）はアプリのサービス層が担う。新規作成時に
--     status='open' で insert 直後に呼ばれる経路があるため、ここでは縛らない。
--   - 回答が存在するアンケートの設問保護は既存トリガー
--     protect_answered_questions がこのRPC内の delete/insert にも適用される。
-- =============================================================

create or replace function public.replace_questions(
  p_survey_id uuid,
  p_questions jsonb
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
  q jsonb;
  v_question_id uuid;
begin
  select user_id into v_owner from surveys where id = p_survey_id for update;
  if not found or v_owner <> auth.uid() then
    raise exception 'KIKITAI:NOT_OWNER:';
  end if;

  delete from questions where survey_id = p_survey_id;

  for q in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into questions (
      survey_id, type, text, description, required,
      config, section_index, order_index, condition
    )
    values (
      p_survey_id,
      q->>'type',
      q->>'text',
      q->>'description',
      coalesce((q->>'required')::boolean, false),
      case when q->'config' is null or q->'config' = 'null'::jsonb then null else q->'config' end,
      coalesce((q->>'section_index')::integer, 0),
      (q->>'order_index')::integer,
      case when q->'condition' is null or q->'condition' = 'null'::jsonb then null else q->'condition' end
    )
    returning id into v_question_id;

    insert into options (question_id, text, order_index)
    select v_question_id, o->>'text', (o->>'order_index')::integer
    from jsonb_array_elements(coalesce(q->'options', '[]'::jsonb)) as o;
  end loop;
end;
$$;

revoke execute on function public.replace_questions(uuid, jsonb) from public, anon;
grant execute on function public.replace_questions(uuid, jsonb) to authenticated;
