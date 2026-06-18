-- =============================================================
-- キキタイ 初期スキーマ（冪等）
-- 既存DBに手動適用済みでも安全に再実行できるよう、
-- create table if not exists / drop policy if exists で構成している。
-- =============================================================

-- ユーザープロフィール（Supabase Authと連携）
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  affiliation text,
  field text,
  created_at timestamp with time zone default now()
);

-- アンケート
create table if not exists surveys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  required_count integer not null default 10,
  deadline date,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamp with time zone default now()
);

-- 設問
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  survey_id uuid references surveys(id) on delete cascade not null,
  type text not null check (type in ('single', 'multiple', 'text', 'scale')),
  text text not null,
  order_index integer not null
);

-- 選択肢
create table if not exists options (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  text text not null,
  order_index integer not null
);

-- 回答セッション
create table if not exists responses (
  id uuid default gen_random_uuid() primary key,
  survey_id uuid references surveys(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(survey_id, user_id)
);

-- 個別回答
create table if not exists answers (
  id uuid default gen_random_uuid() primary key,
  response_id uuid references responses(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  option_id uuid references options(id) on delete set null,
  text_answer text
);

-- RLSの有効化（再実行しても無害）
alter table profiles enable row level security;
alter table surveys enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table responses enable row level security;
alter table answers enable row level security;

-- RLSポリシー（drop if exists → create で冪等化）
drop policy if exists "プロフィールは全員閲覧可" on profiles;
create policy "プロフィールは全員閲覧可" on profiles
  for select using (true);

drop policy if exists "プロフィールは本人のみ編集可" on profiles;
create policy "プロフィールは本人のみ編集可" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "アンケートは全員閲覧可" on surveys;
create policy "アンケートは全員閲覧可" on surveys
  for select using (true);

drop policy if exists "アンケートは本人のみ作成・編集可" on surveys;
create policy "アンケートは本人のみ作成・編集可" on surveys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "設問は全員閲覧可" on questions;
create policy "設問は全員閲覧可" on questions
  for select using (true);

drop policy if exists "設問は本人のみ編集可" on questions;
create policy "設問は本人のみ編集可" on questions
  for all using (
    auth.uid() = (select user_id from surveys where id = survey_id)
  ) with check (
    auth.uid() = (select user_id from surveys where id = survey_id)
  );

drop policy if exists "選択肢は全員閲覧可" on options;
create policy "選択肢は全員閲覧可" on options
  for select using (true);

drop policy if exists "選択肢は本人のみ編集可" on options;
create policy "選択肢は本人のみ編集可" on options
  for all using (
    auth.uid() = (
      select s.user_id from surveys s
      join questions q on q.survey_id = s.id
      where q.id = question_id
    )
  ) with check (
    auth.uid() = (
      select s.user_id from surveys s
      join questions q on q.survey_id = s.id
      where q.id = question_id
    )
  );

drop policy if exists "回答は本人のみ作成可" on responses;
create policy "回答は本人のみ作成可" on responses
  for insert with check (auth.uid() = user_id);

drop policy if exists "回答は本人とアンケート作成者が閲覧可" on responses;
create policy "回答は本人とアンケート作成者が閲覧可" on responses
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select user_id from surveys where id = survey_id)
  );

drop policy if exists "回答は本人のみ作成可（個別）" on answers;
create policy "回答は本人のみ作成可（個別）" on answers
  for insert with check (
    auth.uid() = (select r.user_id from responses r where r.id = response_id)
  );

drop policy if exists "回答内容はアンケート作成者と本人のみ閲覧可" on answers;
create policy "回答内容はアンケート作成者と本人のみ閲覧可" on answers
  for select using (
    auth.uid() = (
      select r.user_id from responses r where r.id = response_id
    )
    or
    auth.uid() = (
      select s.user_id from surveys s
      join questions q on q.survey_id = s.id
      where q.id = question_id
    )
  );
