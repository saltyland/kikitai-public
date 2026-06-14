-- =============================================================
-- 5段付与率テーブルへの移行（冪等・DROP→再作成）
--
-- 変更点:
--   submit_survey_response v4 として再作成。
--   付与額の上限を「コスト×1.5」（旧3段の高品質倍率）から
--   「コスト×1.0」（新5段の PASS=100% が上限）へ変更。
--
-- 5段付与率テーブル（LLM設計書 §7.2・機械フィルタ設計書 §4.2 と統一）:
--   T0   →  0%  （payout_rate=0.0 / earned_points=0）
--   L1-c → 30%  （payout_rate=0.3）
--   L1-b → 50%  （payout_rate=0.5）
--   L1-a → 80%  （payout_rate=0.8）
--   PASS →100%  （payout_rate=1.0）
--
-- SQLサンプル検証（PR記載用）:
--   設問コスト合計 10pt のアンケートで各ティアが正しく計算される例:
--     T0   : ROUND(10 * 0.0) = 0pt  → p_earned_points=0
--     L1-c : ROUND(10 * 0.3) = 3pt
--     L1-b : ROUND(10 * 0.5) = 5pt
--     L1-a : ROUND(10 * 0.8) = 8pt
--     PASS : ROUND(10 * 1.0) = 10pt
--   v_max_points = CEIL(10 * 1.0) = 10 でクランプされる
--   → 旧の 1.5x 上限（15pt）は使われなくなる。
--
-- 維持する既存仕様:
--   - 作成者からの同額消費（consume_points_upto）
--   - 残高内消費のみ（不足でも回答送信は成功・回答者を巻き込まない）
--   - 回答保存・信頼スコア更新・自動 close・設問者への通知
--
-- 冪等性の保証:
--   pay_per_answer / point_economy での冪等性問題を踏まえ、
--   DROP IF EXISTS → CREATE の方式で確実に置き換える。
-- =============================================================

-- 既存シグネチャをすべて削除（DROP→再作成で冪等性を保証）
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer);
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer, integer);
drop function if exists public.submit_survey_response(uuid, jsonb, integer, integer, integer, integer);

-- -------------------------------------------------------------
-- submit_survey_response v4（5段付与率対応）
--
-- 呼び出し元（S1 で grade() を組み込んだ responseService）は
-- payoutRate（0 / 0.3 / 0.5 / 0.8 / 1.0）× baseCost を
-- round() した値を p_earned_points として渡す。
-- DB側は CEIL(base_cost × 1.0) でクランプし、上限を100%に固定する。
-- -------------------------------------------------------------
create function public.submit_survey_response(
  p_survey_id     uuid,
  p_answers       jsonb,
  p_earned_points integer,
  p_trust_delta   integer,
  p_duration_sec  integer default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_survey     record;
  v_response_id uuid;
  v_base_cost  integer;
  v_max_points integer;
  v_award      integer;
  v_count      integer;
  v_closed     boolean := false;
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

  -- 5段付与率の上限: PASS=100% = コスト×1.0（旧の×1.5 上限を廃止）
  select ceil(greatest(1, coalesce(sum(question_point_cost(type)), 0)))::integer
  into v_base_cost
  from questions where survey_id = p_survey_id;

  v_max_points := ceil(v_base_cost * 1.0)::integer;
  v_award      := least(greatest(p_earned_points, 0), v_max_points);

  if v_award > 0 then
    -- 回答者への報酬付与
    insert into point_lots (user_id, amount, reason, expires_at)
    values (v_user_id, v_award, 'answer_reward', now() + interval '180 days');
    perform sync_points_balance(v_user_id);

    -- 作成者から同額を消費（残高の範囲内のみ・不足でも送信成功）
    perform consume_points_upto(v_survey.user_id, v_award);
  end if;

  -- 信頼スコア更新（減点のみ・0〜100 クランプ）
  if p_trust_delta < 0 then
    update profiles
    set trust_score = greatest(0, least(100, trust_score + greatest(p_trust_delta, -10)))
    where id = v_user_id;
  end if;

  -- 必要回答数到達で自動 close・設問者へ通知
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
      null;
    end;
  end if;

  return jsonb_build_object('response_count', v_count, 'closed', v_closed);
end;
$$;

revoke execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) from public, anon;
grant  execute on function public.submit_survey_response(uuid, jsonb, integer, integer, integer) to authenticated;
