-- =============================================================
-- アンケートのライフサイクル保護＋倫理・配信要件の列追加（冪等）
--  1. surveys へ consent_text / target_conditions / min_trust_score / retention_until を追加
--  2. 状態遷移トリガー：draft→open、open→closed のみ許可（closed→open 再オープン等を禁止）
--  3. 設問保護トリガー：回答が存在するアンケートの設問 削除/変更 をDB層でも禁止
--  4. run_data_retention()：保持期限超過アンケートの回答を自動削除（Cronから実行）
-- =============================================================

-- インフォームドコンセント文（回答画面冒頭の同意ゲートに表示）
alter table surveys add column if not exists consent_text text;
-- 属性マッチング配信の条件（例：{"ageMin":18,"ageMax":29,"genders":["女性"]}）。null=全員配信
alter table surveys add column if not exists target_conditions jsonb;
-- 回答者に要求する最低信頼スコア（null=制限なし）
alter table surveys add column if not exists min_trust_score integer;
alter table surveys drop constraint if exists surveys_min_trust_score_check;
alter table surveys add constraint surveys_min_trust_score_check
  check (min_trust_score is null or (min_trust_score between 0 and 100));
-- データ保持期限（超過分の回答はバッチで削除。null=無期限）
alter table surveys add column if not exists retention_until timestamp with time zone;

-- -------------------------------------------------------------
-- 状態遷移ステートマシン（DB層の最終防衛線。アプリ層にも同じ表を持つ：
-- lib/domain/surveyStateMachine.ts と同期を保つこと）
-- -------------------------------------------------------------
create or replace function public.enforce_survey_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if (old.status = 'draft' and new.status = 'open')
     or (old.status = 'open' and new.status = 'closed') then
    return new;
  end if;
  raise exception 'KIKITAI:INVALID_TRANSITION:%:%', old.status, new.status;
end;
$$;

drop trigger if exists survey_status_transition on surveys;
create trigger survey_status_transition
  before update of status on surveys
  for each row execute function public.enforce_survey_status_transition();

-- -------------------------------------------------------------
-- 設問保護：回答が1件でも存在するアンケートの設問は削除・変更できない。
-- replaceQuestions（delete→insert）が answers を on delete cascade で
-- 巻き込み消去する事故をDB層でも防ぐ。
-- 親アンケートごと削除される場合（surveys 行が既に無い）は通す（cascade削除を許可）。
-- -------------------------------------------------------------
create or replace function public.protect_answered_questions()
returns trigger
language plpgsql
as $$
declare
  v_survey_id uuid := coalesce(old.survey_id, new.survey_id);
begin
  if not exists (select 1 from surveys where id = v_survey_id) then
    return coalesce(new, old); -- 親surveyのcascade削除中
  end if;
  if exists (select 1 from responses where survey_id = v_survey_id) then
    raise exception 'KIKITAI:HAS_RESPONSES:';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_answered_questions on questions;
create trigger protect_answered_questions
  before update or delete on questions
  for each row execute function public.protect_answered_questions();

-- -------------------------------------------------------------
-- データ保持期間バッチ：retention_until を超過したアンケートの回答
-- （responses。answers は cascade）を削除する。個人情報保護法/GDPR対応。
-- 戻り値: {"deleted_responses": n}
-- -------------------------------------------------------------
create or replace function public.run_data_retention()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from responses r
  using surveys s
  where r.survey_id = s.id
    and s.retention_until is not null
    and s.retention_until < now();
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('deleted_responses', v_deleted);
end;
$$;

revoke execute on function public.run_data_retention() from public, anon, authenticated;
