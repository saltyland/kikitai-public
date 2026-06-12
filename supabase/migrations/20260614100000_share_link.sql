-- =============================================================
-- 共有リンク公開＋ゲスト回答（冪等）
--  1. surveys.share_token : 共有リンク用トークン（全アンケートに自動付与）
--  2. surveys.visibility  : 'public'（一覧に表示）/ 'unlisted'（リンクを知っている人のみ）
--  3. responses.user_id を NULL 許可にし、ゲスト回答は guest_key（Cookie由来）で重複防止
--  4. get_shared_survey RPC      : トークンから設問つきアンケートを取得（anon可）
--  5. submit_guest_response RPC  : ゲスト回答の保存＋自動close（ポイント付与なし・anon可）
-- =============================================================

-- 共有トークン（既存行にも一括付与してから default / not null を設定）
alter table surveys add column if not exists share_token text;
update surveys set share_token = encode(gen_random_bytes(16), 'hex') where share_token is null;
alter table surveys alter column share_token set default encode(gen_random_bytes(16), 'hex');
alter table surveys alter column share_token set not null;
create unique index if not exists surveys_share_token_key on surveys (share_token);

-- 公開範囲：public=回答一覧に表示 / unlisted=リンクを知っている人のみ（一覧非表示）
alter table surveys add column if not exists visibility text not null default 'public';
alter table surveys drop constraint if exists surveys_visibility_check;
alter table surveys add constraint surveys_visibility_check
  check (visibility in ('public', 'unlisted'));

-- ゲスト回答：user_id を NULL 許可に。重複防止は (survey_id, guest_key) の一意制約で行う
alter table responses alter column user_id drop not null;
alter table responses add column if not exists guest_key text;
create unique index if not exists responses_survey_guest_key
  on responses (survey_id, guest_key) where guest_key is not null;

-- -------------------------------------------------------------
-- 共有トークンからアンケート（設問・選択肢つき）を取得する。
-- 未ログイン（anon）でも実行できるよう security definer で RLS を迂回する。
-- トークンを知らなければ取得できない（推測困難な128bit乱数）。
-- 見つからなければ null を返す。
-- -------------------------------------------------------------
create or replace function public.get_shared_survey(p_token text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select to_jsonb(s) || jsonb_build_object(
    'questions', coalesce((
      select jsonb_agg(
        (to_jsonb(q) || jsonb_build_object(
          'options', coalesce((
            select jsonb_agg(to_jsonb(o) order by o.order_index)
            from options o where o.question_id = q.id
          ), '[]'::jsonb)
        )) order by q.order_index
      )
      from questions q where q.survey_id = s.id
    ), '[]'::jsonb)
  )
  from surveys s
  where s.share_token = p_token;
$$;

-- -------------------------------------------------------------
-- ゲスト回答の送信：回答保存＋required_count 到達時の自動close を
-- 1トランザクションで行う。ポイント付与・信頼スコア更新は行わない。
-- p_guest_key はサーバーが発行する Cookie 値（同一ブラウザの重複回答防止）。
-- -------------------------------------------------------------
create or replace function public.submit_guest_response(
  p_token text,
  p_answers jsonb,
  p_guest_key text,
  p_duration_sec integer default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_survey record;
  v_response_id uuid;
  v_count integer;
  v_closed boolean := false;
begin
  select * into v_survey from surveys where share_token = p_token for update;
  if not found then
    raise exception 'KIKITAI:NOT_FOUND:';
  end if;
  if v_survey.status <> 'open' then
    raise exception 'KIKITAI:NOT_OPEN:';
  end if;
  if v_survey.deadline is not null and v_survey.deadline < current_date then
    raise exception 'KIKITAI:NOT_OPEN:';
  end if;
  if p_guest_key is null or length(p_guest_key) < 16 then
    raise exception 'KIKITAI:NOT_FOUND:';
  end if;

  -- 他アンケートの設問IDを混入させた改ざん payload を弾く
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) as a
    where not exists (
      select 1 from questions q
      where q.id = (a->>'question_id')::uuid and q.survey_id = v_survey.id
    )
  ) then
    raise exception 'KIKITAI:NOT_FOUND:';
  end if;

  begin
    insert into responses (survey_id, user_id, guest_key, duration_sec)
    values (v_survey.id, null, p_guest_key, p_duration_sec)
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

  -- 必要回答数に到達したら自動で締め切る（ログイン回答と同じ扱い）
  select count(*) into v_count from responses where survey_id = v_survey.id;
  if v_count >= v_survey.required_count then
    update surveys set status = 'closed' where id = v_survey.id;
    v_closed := true;
  end if;

  return jsonb_build_object('response_count', v_count, 'closed', v_closed);
end;
$$;

-- ゲスト用RPCは未ログイン（anon）からも実行できる
grant execute on function public.get_shared_survey(text) to anon, authenticated;
grant execute on function public.submit_guest_response(text, jsonb, text, integer) to anon, authenticated;
