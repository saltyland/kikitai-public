-- =============================================================
-- トピック・フォロー機能の基盤スキーマ（冪等）
--  1. topics             : トピックマスタ（カテゴリ分類、初期データ投入）
--  2. survey_topics      : アンケート×トピックの中間テーブル（1〜3件）
--  3. topic_suggestions  : 自由記述のトピック提案（保存のみ、処理は将来対応）
--  4. user_follows       : ユーザー間フォロー
--  5. user_topic_follows : トピックフォロー
--  6. profiles 追加カラム : topics_selected_at / last_topic_digest_at / notification_settings
--  7. surveys 追加インデックス: (status, visibility, created_at)
-- =============================================================

-- -------------------------------------------------------------
-- 1. topics（マスタ。embeddingはAI類似度レコメンド用に予約。
--    pgvector拡張の有無が未確定なため、当面はjsonbで持ち将来移行する）
-- -------------------------------------------------------------
create table if not exists topics (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  description text,
  embedding jsonb,
  created_at timestamp with time zone default now()
);
create unique index if not exists topics_name_key on topics (name);

alter table topics enable row level security;
drop policy if exists "topicsは全員閲覧可" on topics;
create policy "topicsは全員閲覧可" on topics for select using (true);

-- -------------------------------------------------------------
-- 2. survey_topics（1アンケート1〜3トピック。件数チェックはアプリ側zodで実施）
-- -------------------------------------------------------------
create table if not exists survey_topics (
  survey_id uuid references surveys(id) on delete cascade not null,
  topic_id uuid references topics(id) on delete restrict not null,
  primary key (survey_id, topic_id)
);
-- トピック側からのlookup（タイムライン・ダイジェスト集計）に必須
create index if not exists survey_topics_topic_idx on survey_topics (topic_id, survey_id);

alter table survey_topics enable row level security;
drop policy if exists "survey_topicsは全員閲覧可" on survey_topics;
create policy "survey_topicsは全員閲覧可" on survey_topics for select using (true);
drop policy if exists "survey_topicsは所有者のみ変更可" on survey_topics;
create policy "survey_topicsは所有者のみ変更可" on survey_topics
  for all using (exists (select 1 from surveys s where s.id = survey_id and s.user_id = auth.uid()))
  with check (exists (select 1 from surveys s where s.id = survey_id and s.user_id = auth.uid()));

-- -------------------------------------------------------------
-- 3. topic_suggestions（自由記述。運営者がservice_role経由で参照する想定のため
--    select/update/deleteポリシーは設けない＝デフォルト拒否）
-- -------------------------------------------------------------
create table if not exists topic_suggestions (
  id uuid default gen_random_uuid() primary key,
  survey_id uuid references surveys(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default now()
);

alter table topic_suggestions enable row level security;
drop policy if exists "topic_suggestionsは本人のみ作成可" on topic_suggestions;
create policy "topic_suggestionsは本人のみ作成可" on topic_suggestions
  for insert with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 4. user_follows（ユーザー間フォロー。フォロー数等は公開情報として全員select可）
-- -------------------------------------------------------------
create table if not exists user_follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  followee_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (follower_id, followee_id),
  constraint user_follows_no_self check (follower_id <> followee_id)
);
-- publish_survey からのフォロワー一括通知（PR8）に必須
create index if not exists user_follows_followee_idx on user_follows (followee_id);

alter table user_follows enable row level security;
drop policy if exists "user_followsは全員閲覧可" on user_follows;
create policy "user_followsは全員閲覧可" on user_follows for select using (true);
drop policy if exists "user_followsは本人のみ作成削除可" on user_follows;
create policy "user_followsは本人のみ作成削除可" on user_follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- -------------------------------------------------------------
-- 5. user_topic_follows（トピックフォロー）
-- -------------------------------------------------------------
create table if not exists user_topic_follows (
  user_id uuid references profiles(id) on delete cascade not null,
  topic_id uuid references topics(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (user_id, topic_id)
);
-- トピックダイジェスト集計（PR8）に必須
create index if not exists user_topic_follows_topic_idx on user_topic_follows (topic_id, user_id);

alter table user_topic_follows enable row level security;
drop policy if exists "user_topic_followsは本人のみ全操作可" on user_topic_follows;
create policy "user_topic_followsは本人のみ全操作可" on user_topic_follows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 6. profiles 追加カラム
-- -------------------------------------------------------------
alter table profiles add column if not exists topics_selected_at timestamp with time zone;
alter table profiles add column if not exists last_topic_digest_at timestamp with time zone;
alter table profiles add column if not exists notification_settings jsonb not null default '{}'::jsonb;

-- -------------------------------------------------------------
-- 7. surveys 追加インデックス（新着・ダイジェスト集計の絞り込みに必須）
-- -------------------------------------------------------------
create index if not exists surveys_status_visibility_created_idx
  on surveys (status, visibility, created_at);

-- -------------------------------------------------------------
-- 初期マスタデータ（8カテゴリ + その他、計41件）
-- -------------------------------------------------------------
insert into topics (name, category, description) values
  -- 学業・キャリア
  ('就職活動', '学業・キャリア', '就活の進め方や悩みに関するアンケート'),
  ('大学院進学', '学業・キャリア', '進学先や研究室選びに関するアンケート'),
  ('留学・海外経験', '学業・キャリア', '留学や海外経験に関するアンケート'),
  ('資格・スキルアップ', '学業・キャリア', '資格取得やスキルアップに関するアンケート'),
  ('アルバイト・インターン', '学業・キャリア', 'アルバイトやインターンシップに関するアンケート'),
  -- 健康・ライフスタイル
  ('睡眠習慣', '健康・ライフスタイル', '睡眠に関するアンケート'),
  ('食生活・栄養', '健康・ライフスタイル', '食生活や栄養に関するアンケート'),
  ('運動・フィットネス', '健康・ライフスタイル', '運動習慣に関するアンケート'),
  ('メンタルヘルス', '健康・ライフスタイル', '心の健康に関するアンケート'),
  ('一人暮らし', '健康・ライフスタイル', '一人暮らしの生活に関するアンケート'),
  -- テクノロジー・ITサービス
  ('スマートフォン利用', 'テクノロジー・ITサービス', 'スマートフォンの利用習慣に関するアンケート'),
  ('SNS利用習慣', 'テクノロジー・ITサービス', 'SNSの利用に関するアンケート'),
  ('サブスクリプションサービス', 'テクノロジー・ITサービス', '定額制サービスの利用に関するアンケート'),
  ('AIツール活用', 'テクノロジー・ITサービス', 'AIツールの活用に関するアンケート'),
  ('ゲーム・eスポーツ', 'テクノロジー・ITサービス', 'ゲームやeスポーツに関するアンケート'),
  -- 社会・時事
  ('環境・SDGs', '社会・時事', '環境問題やSDGsに関するアンケート'),
  ('ジェンダー・多様性', '社会・時事', 'ジェンダーや多様性に関するアンケート'),
  ('政治・選挙', '社会・時事', '政治や選挙に関するアンケート'),
  ('地域社会', '社会・時事', '地域社会に関するアンケート'),
  ('防災・安全', '社会・時事', '防災や安全に関するアンケート'),
  -- エンタメ・趣味
  ('音楽・ライブ', 'エンタメ・趣味', '音楽やライブに関するアンケート'),
  ('映画・ドラマ', 'エンタメ・趣味', '映画やドラマに関するアンケート'),
  ('アニメ・漫画', 'エンタメ・趣味', 'アニメや漫画に関するアンケート'),
  ('旅行・観光', 'エンタメ・趣味', '旅行や観光に関するアンケート'),
  ('読書・書籍', 'エンタメ・趣味', '読書や書籍に関するアンケート'),
  -- 消費・お金
  ('キャッシュレス決済', '消費・お金', 'キャッシュレス決済に関するアンケート'),
  ('節約・お金の管理', '消費・お金', '節約やお金の管理に関するアンケート'),
  ('投資・資産形成', '消費・お金', '投資や資産形成に関するアンケート'),
  ('ファッション・買い物', '消費・お金', 'ファッションや買い物に関するアンケート'),
  ('フードデリバリー', '消費・お金', 'フードデリバリーに関するアンケート'),
  -- 学術・研究
  ('研究方法論', '学術・研究', '研究方法論に関するアンケート'),
  ('統計・データ分析', '学術・研究', '統計やデータ分析に関するアンケート'),
  ('アカデミックライティング', '学術・研究', '論文執筆やライティングに関するアンケート'),
  ('学会・論文', '学術・研究', '学会や論文に関するアンケート'),
  ('オンライン学習', '学術・研究', 'オンライン学習に関するアンケート'),
  -- コミュニケーション・人間関係
  ('友人関係', 'コミュニケーション・人間関係', '友人関係に関するアンケート'),
  ('恋愛・パートナーシップ', 'コミュニケーション・人間関係', '恋愛やパートナーシップに関するアンケート'),
  ('家族関係', 'コミュニケーション・人間関係', '家族関係に関するアンケート'),
  ('オンラインコミュニティ', 'コミュニケーション・人間関係', 'オンラインコミュニティに関するアンケート'),
  ('ボランティア活動', 'コミュニケーション・人間関係', 'ボランティア活動に関するアンケート'),
  -- その他（当てはまる領域がない場合の受け皿）
  ('その他', 'その他', '上記に当てはまらないテーマのアンケート')
on conflict (name) do nothing;
