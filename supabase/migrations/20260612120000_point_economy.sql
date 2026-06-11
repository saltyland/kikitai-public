-- =============================================================
-- ポイント経済の整合性＋プロフィールRLS是正（冪等）
--  1. consume_points        : FIFO（granted_at昇順・行ロック）でポイント束を消費
--  2. publish_survey        : 公開コスト（required_count×設問コスト）消費＋open化を1トランザクションで
--  3. submit_survey_response: 回答保存＋ポイント付与＋信頼スコア更新＋上限到達時の自動closeを1トランザクションで
--  4. sync_points_balance   : profiles.points を1文のUPDATEで同期（lost update対策）
--  5. profiles の select using(true) を廃止し、他人には public_profiles ビュー
--     （private_fields でマスク・points/trust_score 非公開）経由のみ許可
--
-- ビジネスエラーは 'KIKITAI:<CODE>:<詳細>' 形式の raise exception で返し、
-- アプリ側（lib/repositories/dbError.ts）が日本語メッセージへ変換する。
-- =============================================================

-- -------------------------------------------------------------
-- 設問タイプ別ポイント単価。
-- ※ lib/domain/questions/ 各クラスの pointCost と必ず同期させること。
-- -------------------------------------------------------------
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
    when 'multiple'  then 1.0
    when 'text'      then 1.0
    when 'paragraph' then 2.0
    when 'grid'      then 1.5
    else 1.0
  end;
$$;

-- -------------------------------------------------------------
-- profiles.points を point_lots（期限内）の合計に同期する。
-- 1文のUPDATE内で集計するため、read-modify-write の lost update が起きない。
-- -------------------------------------------------------------
create or replace function public.sync_points_balance(p_user_id uuid)
returns integer
language sql
security definer set search_path = public
as $$
  update profiles
  set points = coalesce(
    (select sum(amount) from point_lots
     where user_id = p_user_id and expires_at > now()), 0)
  where id = p_user_id
  returning points;
$$;

-- -------------------------------------------------------------
-- ポイント消費：granted_at 昇順（FIFO）で行ロックしながら減算。
-- 束をまたぐ場合は削除、束の途中までなら分割（amountを減らす）。
-- 残高不足は 'KIKITAI:INSUFFICIENT_POINTS:<必要>:<残高>' で失敗（全体ロールバック）。
-- -------------------------------------------------------------
create or replace function public.consume_points(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_balance integer;
  v_lot record;
begin
  if p_amount <= 0 then
    return;
  end if;

  -- 残高チェック（消費対象の束をロックしてから合計する）
  select coalesce(sum(amount), 0) into v_balance
  from (
    select amount from point_lots
    where user_id = p_user_id and expires_at > now()
    for update
  ) locked;

  if v_balance < p_amount then
    raise exception 'KIKITAI:INSUFFICIENT_POINTS:%:%', p_amount, v_balance;
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
end;
$$;

-- -------------------------------------------------------------
-- アンケート公開：コスト＝ ceil(required_count × 設問ポイント単価合計)。
-- 所有者本人・draft のみ。コスト計算〜消費〜open化を1トランザクションで行う。
-- 戻り値＝実際に消費したポイント。
-- -------------------------------------------------------------
create or replace function public.publish_survey(p_survey_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_survey record;
  v_cost integer;
begin
  select * into v_survey from surveys where id = p_survey_id for update;
  if not found or v_survey.user_id <> auth.uid() then
    raise exception 'KIKITAI:NOT_OWNER:';
  end if;
  if v_survey.status <> 'draft' then
    raise exception 'KIKITAI:NOT_DRAFT:';
  end if;

  select ceil(v_survey.required_count * coalesce(sum(question_point_cost(type)), 0))::integer
  into v_cost
  from questions where survey_id = p_survey_id;

  perform consume_points(auth.uid(), v_cost);
  update surveys set status = 'open' where id = p_survey_id;
  return v_cost;
end;
$$;

-- -------------------------------------------------------------
-- 回答送信のアトミック化：
--   回答セッション＋個別回答の保存／報酬ポイント付与／信頼スコア更新／
--   required_count 到達時の自動close を1トランザクションで行う。
-- p_answers: [{question_id, option_id, text_answer, row_label}, ...]
-- p_earned_points は改ざん対策として「設問コスト合計×1.5」を上限にクランプする。
-- 戻り値: {"response_count": n, "closed": bool}
-- -------------------------------------------------------------
create or replace function public.submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb,
  p_earned_points integer,
  p_trust_delta integer
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_survey record;
  v_response_id uuid;
  v_max_points integer;
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
    insert into responses (survey_id, user_id)
    values (p_survey_id, v_user_id)
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

  -- 報酬付与（サーバー計算値だが、API直叩き対策として上限をDB側でも強制する）
  select ceil(greatest(1, coalesce(sum(question_point_cost(type)), 0)) * 1.5)::integer
  into v_max_points
  from questions where survey_id = p_survey_id;

  if p_earned_points > 0 then
    insert into point_lots (user_id, amount, reason, expires_at)
    values (v_user_id, least(p_earned_points, v_max_points), 'answer_reward',
            now() + interval '180 days');
    perform sync_points_balance(v_user_id);
  end if;

  -- 信頼スコア更新（減点のみ許可・0〜100にクランプ）
  if p_trust_delta < 0 then
    update profiles
    set trust_score = greatest(0, least(100, trust_score + greatest(p_trust_delta, -10)))
    where id = v_user_id;
  end if;

  -- 必要回答数に到達したら自動で締め切る
  select count(*) into v_count from responses where survey_id = p_survey_id;
  if v_count >= v_survey.required_count then
    update surveys set status = 'closed' where id = p_survey_id;
    v_closed := true;
  end if;

  return jsonb_build_object('response_count', v_count, 'closed', v_closed);
end;
$$;

-- RPCはログイン済みユーザーのみ実行可
revoke execute on function public.consume_points(uuid, integer) from public, anon;
revoke execute on function public.publish_survey(uuid) from public, anon;
revoke execute on function public.submit_survey_response(uuid, jsonb, integer, integer) from public, anon;
revoke execute on function public.sync_points_balance(uuid) from public, anon;
grant execute on function public.consume_points(uuid, integer) to authenticated;
grant execute on function public.publish_survey(uuid) to authenticated;
grant execute on function public.submit_survey_response(uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.sync_points_balance(uuid) to authenticated;

-- -------------------------------------------------------------
-- プロフィールRLS是正：
--   生テーブルの select は本人のみ。他人のプロフィールは public_profiles ビュー
--   経由でのみ参照でき、private_fields に含めた属性は null にマスクされる。
--   points / trust_score / private_fields / plan はビューに含めない（本人専用）。
-- -------------------------------------------------------------
drop policy if exists "プロフィールは全員閲覧可" on profiles;
drop policy if exists "プロフィールは本人のみ閲覧可" on profiles;
create policy "プロフィールは本人のみ閲覧可" on profiles
  for select using (auth.uid() = id);

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  nickname,
  avatar_url,
  created_at,
  case when private_fields ? 'affiliation' then null else affiliation end as affiliation,
  case when private_fields ? 'field'       then null else field       end as field,
  case when private_fields ? 'age'         then null else age         end as age,
  case when private_fields ? 'gender'      then null else gender      end as gender,
  case when private_fields ? 'occupation'  then null else occupation  end as occupation,
  case when private_fields ? 'grade'       then null else grade       end as grade,
  case when private_fields ? 'major'       then null else major       end as major
from profiles;

-- security definer ビュー（所有者権限で実行）として他人の行も読めるようにする
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;
