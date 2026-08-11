// =============================================================
// 仮想ユーザー10人 × アンケート3件（計30件）投入スクリプト
//   - 各アンケートは deadline=null（期限なし、ずっと表示され続ける）
//   - 各アンケートに他の仮想ユーザーからの回答を数件ずつ投入
//   - 既存の scripts/seed-demo.mjs と同じ Management API 経由のSQL実行方式
// =============================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  const path = join(root, '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !accessToken) {
  console.error('✖ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ACCESS_TOKEN が必要です。');
  process.exitCode = 1;
  throw new Error('missing env');
}
const ref = new URL(url).hostname.split('.')[0];

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`SQL実行に失敗 (${res.status}): ${body}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (s) => (s == null ? 'null' : q(s));
const qj = (obj) => (obj == null ? 'null' : `${q(JSON.stringify(obj))}::jsonb`);

// -------------------------------------------------------------
// 仮想ユーザー10人
// -------------------------------------------------------------
const SEED_PASSWORD = 'kikitai-seed-2026';
const VIRTUAL_USERS = [
  { email: 'seed-01@kikitai.seed', nickname: '田中さくら', affiliation: '文学部3年' },
  { email: 'seed-02@kikitai.seed', nickname: '鈴木大輝', affiliation: '理工学部2年' },
  { email: 'seed-03@kikitai.seed', nickname: '佐藤ののか', affiliation: '経済学部4年' },
  { email: 'seed-04@kikitai.seed', nickname: '高橋蓮', affiliation: '情報理工学部3年' },
  { email: 'seed-05@kikitai.seed', nickname: '伊藤陽菜', affiliation: '教育学部1年' },
  { email: 'seed-06@kikitai.seed', nickname: '渡辺悠真', affiliation: '法学部2年' },
  { email: 'seed-07@kikitai.seed', nickname: '山本芽依', affiliation: '国際教養学部3年' },
  { email: 'seed-08@kikitai.seed', nickname: '中村蒼', affiliation: '基幹理工学部修士1年' },
  { email: 'seed-09@kikitai.seed', nickname: '小林凛', affiliation: '人間科学部2年' },
  { email: 'seed-10@kikitai.seed', nickname: '加藤颯太', affiliation: '商学部3年' },
];

const scale5 = (minLabel, maxLabel) => ({ min: 1, max: 5, minLabel, maxLabel });

// -------------------------------------------------------------
// アンケートのテーマ10種（各3問）。10人 × 3件 = 30件を持ち回りで割り当てる
// -------------------------------------------------------------
const TOPICS = [
  {
    title: '一人暮らしの家計管理について',
    description: '一人暮らし学生の家計のやりくりを調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '毎月の家賃はどれくらいですか？', required: true, opts: ['3万円未満', '3〜5万円', '5〜7万円', '7万円以上'] },
      { type: 'multiple', text: '節約のために実践していることをすべて選んでください', opts: ['自炊', 'サブスクの見直し', 'ポイ活', '格安SIM', '特にしていない'] },
      { type: 'scale', text: '家計管理にどれくらい自信がありますか？', cfg: scale5('自信がない', '自信がある') },
    ],
  },
  {
    title: 'サークル・部活動の参加実態',
    description: '大学のサークル・部活の参加状況を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '現在サークル・部活に所属していますか？', required: true, opts: ['体育会系', '文化系', '複数掛け持ち', '所属していない'] },
      { type: 'multiple', text: '参加する理由をすべて選んでください', opts: ['友人関係', 'スキルアップ', '趣味', '就活対策', '特になし'] },
      { type: 'text', text: 'サークル・部活で印象に残っている出来事を教えてください' },
    ],
  },
  {
    title: '就活・インターンシップ準備状況',
    description: '就職活動の準備状況について調べています。',
    required: 25,
    questions: [
      { type: 'single', text: '就活・インターンの準備状況はどれくらいですか？', required: true, opts: ['まだ何もしていない', '情報収集中', 'ES作成中', '選考中', '内定済み'] },
      { type: 'scale', text: '就活に対する不安の大きさは？', cfg: scale5('不安はない', 'とても不安') },
      { type: 'paragraph', text: '就活で困っていることがあれば教えてください' },
    ],
  },
  {
    title: 'カフェ・勉強スペースの利用傾向',
    description: '学習場所の使い分けについて調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '普段よく使う勉強場所はどこですか？', required: true, opts: ['自宅', '大学の図書館', 'カフェ', '自習室'] },
      { type: 'multiple', text: '勉強場所を選ぶ基準をすべて選んでください', opts: ['静かさ', 'Wi-Fi環境', 'アクセスの良さ', '電源の有無', '価格'] },
      { type: 'scale', text: '今の勉強環境にどれくらい満足していますか？', cfg: scale5('不満', '満足') },
    ],
  },
  {
    title: 'スマホアプリの利用習慣',
    description: '日常的に使うアプリの傾向を調べています。',
    required: 20,
    questions: [
      { type: 'multiple', text: '毎日使うアプリのジャンルをすべて選んでください', required: true, opts: ['SNS', '動画配信', '音楽', 'ゲーム', '学習・勉強'] },
      { type: 'dropdown', text: '1日のスマホ利用時間はどれくらいですか？', opts: ['2時間未満', '2〜4時間', '4〜6時間', '6時間以上'] },
      { type: 'scale', text: 'スマホ依存を感じることはありますか？', cfg: scale5('全くない', 'よくある') },
    ],
  },
  {
    title: '健康・運動習慣について',
    description: '大学生の運動習慣を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '週にどれくらい運動していますか？', required: true, opts: ['ほぼ毎日', '週2〜3回', '週1回', 'ほとんどしない'] },
      { type: 'scale', text: '自分の体力にどれくらい自信がありますか？', cfg: scale5('自信がない', '自信がある') },
      { type: 'text', text: '運動を続けるための工夫があれば教えてください' },
    ],
  },
  {
    title: 'アルバイト経験と時給満足度',
    description: 'アルバイトの実態について調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '現在アルバイトをしていますか？', required: true, opts: ['している（1つ）', 'している（掛け持ち）', '今はしていない'] },
      { type: 'dropdown', text: '時給はどれくらいですか？（している方のみ）', opts: ['1000円未満', '1000〜1200円', '1200〜1500円', '1500円以上'] },
      { type: 'scale', text: '仕事内容に満足していますか？', cfg: scale5('不満', '満足') },
    ],
  },
  {
    title: '大学のキャリア支援利用状況',
    description: 'キャリアセンター等の利用実態を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '大学のキャリア支援を利用したことがありますか？', required: true, opts: ['よく利用する', '数回利用した', '利用したことがない'] },
      { type: 'multiple', text: '利用したい支援をすべて選んでください', opts: ['ES添削', '模擬面接', '個別相談', 'OB・OG訪問紹介', 'インターン紹介'] },
      { type: 'paragraph', text: 'キャリア支援に期待することを教えてください' },
    ],
  },
  {
    title: '音楽・エンタメ消費傾向',
    description: '大学生の音楽・エンタメの楽しみ方を調べています。',
    required: 20,
    questions: [
      { type: 'multiple', text: 'よく利用する音楽・動画サービスをすべて選んでください', required: true, opts: ['Spotify', 'YouTube Music', 'Apple Music', 'YouTube', 'サブスクは使わない'] },
      { type: 'dropdown', text: '月にライブ・映画館に行く頻度は？', opts: ['ほぼ行かない', '月1回程度', '月2〜3回', '月4回以上'] },
      { type: 'scale', text: 'エンタメへの支出は多いと思いますか？', cfg: scale5('少ない', '多い') },
    ],
  },
  {
    title: '授業ノートの取り方・勉強法',
    description: '授業ノートや勉強法の工夫を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: 'ノートは主に何で取りますか？', required: true, opts: ['手書き（紙）', 'タブレット', 'PC', 'ほぼ取らない'] },
      { type: 'multiple', text: '試験前の勉強法をすべて選んでください', opts: ['過去問演習', '友人と勉強会', 'まとめノート作成', '講義動画の見返し', '特に対策しない'] },
      { type: 'text', text: '自分なりの勉強のコツがあれば教えてください' },
    ],
  },
];

function surveySql(user, survey) {
  const lines = [];
  lines.push(`  if not exists (select 1 from surveys where user_id = uid and title = ${q(survey.title)}) then`);
  lines.push(
    `    insert into surveys (user_id, title, description, required_count, deadline, status, sections, visibility)` +
      ` values (uid, ${q(survey.title)}, ${qn(survey.description)}, ${survey.required}, null, 'open', '[]'::jsonb, 'public') returning id into sid;`
  );
  survey.questions.forEach((question, i) => {
    lines.push(
      `    insert into questions (survey_id, type, text, description, required, order_index, section_index, config, condition)` +
        ` values (sid, ${q(question.type)}, ${q(question.text)}, ${qn(question.desc)}, ${!!question.required}, ${i}, 0, ${qj(
          question.cfg
        )}, null) returning id into qid;`
    );
    if (question.type === 'scale') {
      const { min, max } = question.cfg;
      lines.push(`    for v in ${min}..${max} loop`);
      lines.push(`      insert into options (question_id, text, order_index) values (qid, v::text, v - ${min});`);
      lines.push(`    end loop;`);
    } else {
      (question.opts ?? []).forEach((opt, j) => {
        lines.push(`    insert into options (question_id, text, order_index) values (qid, ${q(opt)}, ${j});`);
      });
    }
  });
  lines.push(`    created := created + 1;`);
  lines.push(`  end if;`);
  return lines.join('\n');
}

function seedBlock(user, surveys) {
  return `do $$
declare
  uid uuid;
  sid uuid;
  qid uuid;
  v int;
  created int := 0;
begin
  select id into uid from auth.users where email = ${q(user.email)};
  if uid is null then
    raise exception 'ユーザー % が見つかりません', ${q(user.email)};
  end if;
${surveys.map((s) => surveySql(user, s)).join('\n')}
  raise notice '% に % 件作成', ${q(user.email)}, created;
end $$;`;
}

function createUserSql(user) {
  return `do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = ${q(user.email)};
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      ${q(user.email)}, extensions.crypt(${q(SEED_PASSWORD)}, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${qj({ nickname: user.nickname, affiliation: user.affiliation })},
      now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', ${q(user.email)}, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
end $$;`;
}

// -------------------------------------------------------------
// 回答の投入（他の仮想ユーザーから、各アンケートに数件ずつ）
// -------------------------------------------------------------
const RESPONSE_SQL = `do $$
declare
  s record;
  q record;
  resp_uid uuid;
  n_resp int;
  opt_ids uuid[];
  chosen_opt uuid;
  row_label text;
  col_labels text[];
  chosen_col text;
  rid uuid;
  seed_emails text[] := array[${VIRTUAL_USERS.map((u) => q(u.email)).join(', ')}];
  author_email text;
  i int;
begin
  for s in
    select sv.id, sv.user_id from surveys sv
    join auth.users au on au.id = sv.user_id
    where au.email = any(seed_emails)
  loop
    select email into author_email from auth.users where id = s.user_id;
    n_resp := 3 + floor(random() * 4)::int;
    for resp_uid in
      select id from auth.users
      where email = any(seed_emails) and email <> author_email
      order by random() limit n_resp
    loop
      if not exists (select 1 from responses where survey_id = s.id and user_id = resp_uid) then
        insert into responses (survey_id, user_id, duration_sec)
          values (s.id, resp_uid, 30 + floor(random() * 150)::int) returning id into rid;
        for q in select id, type, config from questions where survey_id = s.id order by order_index loop
          if q.type in ('single', 'dropdown', 'scale') then
            select array_agg(id) into opt_ids from options where question_id = q.id;
            if opt_ids is not null and array_length(opt_ids, 1) > 0 then
              chosen_opt := opt_ids[1 + floor(random() * array_length(opt_ids, 1))::int];
              insert into answers (response_id, question_id, option_id) values (rid, q.id, chosen_opt);
            end if;
          elsif q.type = 'multiple' then
            select array_agg(id) into opt_ids from options where question_id = q.id;
            if opt_ids is not null and array_length(opt_ids, 1) > 0 then
              for i in 1..least(array_length(opt_ids, 1), 1 + floor(random() * 3)::int) loop
                chosen_opt := opt_ids[1 + floor(random() * array_length(opt_ids, 1))::int];
                insert into answers (response_id, question_id, option_id)
                  select rid, q.id, chosen_opt
                  where not exists (
                    select 1 from answers where response_id = rid and question_id = q.id and option_id = chosen_opt
                  );
              end loop;
            end if;
          elsif q.type = 'grid' then
            col_labels := array(select jsonb_array_elements_text(q.config->'columns'));
            for row_label in select jsonb_array_elements_text(q.config->'rows') loop
              chosen_col := col_labels[1 + floor(random() * array_length(col_labels, 1))::int];
              insert into answers (response_id, question_id, option_id, text_answer, row_label)
                values (rid, q.id, null, chosen_col, row_label);
            end loop;
          else
            insert into answers (response_id, question_id, text_answer)
              values (
                rid, q.id,
                (array['丁寧に回答しました。', '特に不満はありません。', 'もう少し選択肢が欲しいです。', '参考になりました。', '普段から意識しています。'])
                  [1 + floor(random() * 5)::int]
              );
          end if;
        end loop;
      end if;
    end loop;
  end loop;
end $$;`;

async function main() {
  console.log(`▶ プロジェクト: ${ref}`);

  for (const user of VIRTUAL_USERS) {
    console.log(`▶ ユーザー作成中: ${user.nickname} (${user.email})`);
    await runSql(createUserSql(user));
  }
  console.log('✔ 仮想ユーザー10人を作成完了');

  for (let i = 0; i < VIRTUAL_USERS.length; i++) {
    const user = VIRTUAL_USERS[i];
    const topics = [TOPICS[i * 3 % 10], TOPICS[(i * 3 + 1) % 10], TOPICS[(i * 3 + 2) % 10]];
    console.log(`▶ ${user.nickname} のアンケート3件を投入中…`);
    await runSql(seedBlock(user, topics));
  }
  console.log('✔ アンケート30件の投入完了');

  console.log('▶ 回答データを投入中…（数分かかる場合があります）');
  await runSql(RESPONSE_SQL);
  console.log('✔ 回答データ投入完了');

  const counts = await runSql(
    `select au.raw_user_meta_data->>'nickname' as nickname, count(distinct sv.id) as surveys, count(distinct r.id) as responses
     from auth.users au
     left join surveys sv on sv.user_id = au.id
     left join responses r on r.survey_id = sv.id
     where au.email = any(array[${VIRTUAL_USERS.map((u) => q(u.email)).join(', ')}])
     group by au.raw_user_meta_data->>'nickname'
     order by nickname;`
  );
  console.log('▶ 投入結果:');
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error('✖', e.message);
  process.exitCode = 1;
});
