// =============================================================
// 回答可能アンケートの一括リセット（ワンショット）
//
//   node scripts/reset-answerable-surveys.mjs
//
// やること:
//   1. 現在「回答可能」（status='open' かつ 期限内）な全アンケートを削除
//      （questions/options/responses等はCASCADEで自動削除）
//   2. 公式アカウント（official@kikitai.app）に新しいアンケート10件を投入
//   3. developerアカウント（zhendayantian@fuji.waseda.jp）に新しいアンケート10件を投入
//
// 実行は Management API の query エンドポイント（SUPABASE_ACCESS_TOKEN のみで可）。
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
  process.exit(1);
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

const OFFICIAL_EMAIL = 'official@kikitai.app';
const DEVELOPER_EMAIL = 'zhendayantian@fuji.waseda.jp';

/** SQL文字列リテラル用エスケープ */
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (s) => (s == null ? 'null' : q(s));
const qj = (obj) => (obj == null ? 'null' : `${q(JSON.stringify(obj))}::jsonb`);

const scale5 = (minLabel, maxLabel) => ({ min: 1, max: 5, minLabel, maxLabel });

// -------------------------------------------------------------
// 新規アンケート定義（公式10件）
// -------------------------------------------------------------
const OFFICIAL_SURVEYS = [
  {
    title: '【公式】夏季キャンパス生活実態調査',
    description: '夏休み期間の過ごし方・登校頻度について調べる公式アンケートです。',
    required: 25,
    questions: [
      { type: 'single', text: '夏休み中、どのくらい大学に来る予定ですか？', required: true, opts: ['週3回以上', '週1〜2回', '月数回', 'ほとんど来ない'] },
      { type: 'multiple', text: '夏休み中の主な過ごし方をすべて選んでください', opts: ['アルバイト', '研究・課題', '旅行', 'インターン', 'のんびり過ごす'] },
      { type: 'scale', text: '夏休みの満足度を予想で教えてください', cfg: scale5('不満そう', '楽しみ') },
      { type: 'text', text: '夏休みにやりたいことを教えてください' },
    ],
  },
  {
    title: '【公式】キキタイのUI改善アンケート',
    description: '画面の使いやすさについて率直な意見を募集します。',
    required: 30,
    questions: [
      { type: 'scale', text: 'キキタイの画面デザインは見やすいですか？', required: true, cfg: scale5('見にくい', '見やすい') },
      { type: 'multiple', text: '使いにくいと感じる画面をすべて選んでください', opts: ['アンケート作成画面', '回答画面', 'マイページ', '集計画面', '特にない'] },
      { type: 'dropdown', text: '主に使う端末は？', opts: ['スマホ', 'PC', 'タブレット'] },
      { type: 'paragraph', text: '改善してほしいUI上の点を具体的に教えてください' },
    ],
  },
  {
    title: '【公式】学内Wi-Fi環境に関する調査',
    description: '学内の通信環境の満足度を施設別に調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '学内Wi-Fiを日常的に使いますか？', required: true, opts: ['よく使う', 'たまに使う', '使わない'] },
      {
        type: 'grid',
        text: '施設別の通信品質を評価してください',
        required: true,
        cfg: { rows: ['図書館', '教室', '学食', '自習室'], columns: ['不満', 'やや不満', '普通', 'やや満足', '満足'], multiple: false },
      },
      { type: 'paragraph', text: '通信環境について困った経験があれば教えてください' },
    ],
  },
  {
    title: '【公式】サークル・部活動への参加実態調査',
    description: '学生のサークル参加状況と満足度を調べます。',
    required: 25,
    questions: [
      { type: 'single', text: '現在サークル・部活動に所属していますか？', required: true, opts: ['体育会系', '文化系', '複数所属', '所属していない'] },
      {
        type: 'multiple',
        text: '所属している理由をすべて選んでください',
        opts: ['趣味・興味', '友人関係', '実績・大会出場', '就活でのアピール'],
        cond: { sourceQuestionOrder: 0, optionText: '体育会系' },
      },
      { type: 'scale', text: '所属している（していた）活動への満足度', cfg: scale5('不満', '大満足') },
      { type: 'text', text: 'サークル・部活動について感じることを教えてください' },
    ],
  },
  {
    title: '【公式】キャッシュレス決済の利用状況調査',
    description: '大学生の支払い手段の使い分けを調べます。',
    required: 30,
    questions: [
      { type: 'multiple', text: 'よく使う決済方法をすべて選んでください', required: true, opts: ['現金', 'クレジットカード', 'QRコード決済', '交通系IC', 'デビットカード'] },
      { type: 'dropdown', text: 'キャッシュレス決済の利用割合はどれくらいですか？', opts: ['ほぼ現金', '半々', 'ほぼキャッシュレス'] },
      { type: 'scale', text: 'キャッシュレス決済に不安を感じますか？', cfg: scale5('感じない', '強く感じる') },
      { type: 'paragraph', text: '決済手段について困った経験があれば教えてください' },
    ],
  },
  {
    title: '【公式】就活・キャリア支援に関する意識調査',
    description: 'キャリアセンターや就活支援サービスの利用状況を調べます。',
    required: 25,
    sections: [
      { title: '利用状況', description: '現在の就活準備状況についてお聞きします。' },
      { title: '支援への期待', description: '今後欲しい支援を教えてください。' },
    ],
    questions: [
      { type: 'single', text: '就職活動の準備状況は？', required: true, section: 0, opts: ['始めている', 'これから始める', '進学予定で未定', 'まだ考えていない'] },
      { type: 'multiple', text: '利用したことのある支援をすべて選んでください', section: 0, opts: ['大学のキャリアセンター', '就活エージェント', 'OB・OG訪問', 'インターンシップ', '特になし'] },
      { type: 'scale', text: '今のキャリア支援に満足していますか？', section: 1, cfg: scale5('不満', '大満足') },
      { type: 'paragraph', text: '就活支援であったら嬉しいサービスを教えてください', section: 1 },
    ],
  },
  {
    title: '【公式】大学周辺の住環境満足度調査',
    description: '一人暮らし・実家通学それぞれの住環境への満足度を調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '現在の住居形態は？', required: true, opts: ['一人暮らし', '実家', '寮', 'シェアハウス'] },
      { type: 'dropdown', text: '大学までの片道移動時間はどれくらいですか？', opts: ['15分未満', '15〜30分', '30分〜1時間', '1時間以上'] },
      { type: 'scale', text: '現在の住環境に満足していますか？', cfg: scale5('不満', '大満足') },
      { type: 'text', text: '住環境について困っていることがあれば教えてください' },
    ],
  },
  {
    title: '【公式】大学の食堂・売店の利用に関する調査',
    description: '学食・売店の利用頻度と要望を調べます。',
    required: 25,
    questions: [
      { type: 'single', text: '学内の売店を利用しますか？', required: true, opts: ['よく利用する', 'たまに利用する', '利用しない'] },
      { type: 'multiple', text: '売店でよく買うものをすべて選んでください', opts: ['パン・軽食', '飲料', 'お菓子', '文房具・雑貨', '特に買わない'] },
      { type: 'dropdown', text: '混雑のピーク時間帯はいつだと感じますか？', opts: ['1限後', '昼休み', '4限後', '特に感じない'] },
      { type: 'paragraph', text: '売店・学食に増やしてほしい商品があれば教えてください' },
    ],
  },
  {
    title: '【公式】キキタイのポイント使い道アンケート',
    description: '貯まったポイントの使い方・希望する使い道を調べます。',
    required: 30,
    questions: [
      { type: 'single', text: '現在ポイントをどのように使っていますか？', required: true, opts: ['特典に交換', '貯めている', 'まだ使い方を決めていない'] },
      { type: 'multiple', text: '今後追加してほしい使い道をすべて選んでください', opts: ['Amazonギフト券', '学内売店クーポン', '現金振込', '寄付', '他サービスとの連携'] },
      { type: 'scale', text: 'ポイント還元率に満足していますか？', cfg: scale5('不満', '大満足') },
      { type: 'paragraph', text: 'ポイントシステムについて要望があれば教えてください' },
    ],
  },
  {
    title: '【公式】秋学期の履修・授業に関する意識調査',
    description: '秋学期の授業選択や履修登録に関する満足度を調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '履修登録のしやすさはどうでしたか？', required: true, opts: ['とても良い', '良い', '普通', '不満', '非常に不満'] },
      {
        type: 'grid',
        text: '次の項目について評価してください',
        required: true,
        cfg: { rows: ['シラバスの分かりやすさ', '抽選システムの公平さ', '時間割の組みやすさ'], columns: ['不満', 'やや不満', '普通', 'やや満足', '満足'], multiple: false },
      },
      { type: 'paragraph', text: '履修登録システムについて改善してほしい点を教えてください' },
    ],
  },
];

// -------------------------------------------------------------
// 新規アンケート定義（developer 10件）
// -------------------------------------------------------------
const DEVELOPER_SURVEYS = [
  {
    title: '研究データ管理に関する大学院生向け調査',
    description: '研究室でのデータ保存・バックアップの実態を調べています。',
    required: 15,
    questions: [
      { type: 'single', text: '研究データのバックアップを取っていますか？', required: true, opts: ['複数箇所に定期保存', 'たまに保存', 'ほとんどしていない'] },
      { type: 'multiple', text: '使っているストレージをすべて選んでください', opts: ['クラウド（Google Drive等）', '研究室サーバー', '外付けHDD', 'USBメモリ', 'PCのみ'] },
      { type: 'scale', text: 'データ消失への不安はどれくらいありますか？', cfg: scale5('全くない', '非常にある') },
      { type: 'text', text: 'データ管理で困った経験があれば教えてください' },
    ],
  },
  {
    title: 'プログラミング学習における詰まりポイント調査',
    description: '学習中にどこで詰まりやすいかを開発者目線で調べています。',
    required: 20,
    questions: [
      { type: 'single', text: 'プログラミング学習歴はどれくらいですか？', required: true, opts: ['半年未満', '半年〜1年', '1〜3年', '3年以上'] },
      { type: 'multiple', text: 'よく詰まるポイントをすべて選んでください', required: true, opts: ['環境構築', 'エラーメッセージの理解', 'アルゴリズム設計', 'デバッグ', 'ライブラリの使い方'] },
      { type: 'dropdown', text: '詰まったときに最初にすることは？', opts: ['公式ドキュメントを読む', '検索エンジンで調べる', 'AIに質問する', '人に聞く'] },
      { type: 'paragraph', text: '学習で特に苦労したエピソードを教えてください' },
    ],
  },
  {
    title: 'AIアシスタントの開発作業への活用調査',
    description: 'コーディング支援AIをどう使っているかを調べる開発者向けアンケートです。',
    required: 25,
    questions: [
      { type: 'multiple', text: '使っているAIコーディング支援ツールをすべて選んでください', required: true, opts: ['ChatGPT', 'Claude', 'GitHub Copilot', 'Gemini', '使っていない'] },
      {
        type: 'grid',
        text: '次の作業でのAI活用度を教えてください',
        required: true,
        cfg: { rows: ['コード生成', 'デバッグ', 'コードレビュー', 'ドキュメント作成'], columns: ['使わない', 'たまに使う', 'よく使う'], multiple: false },
      },
      { type: 'scale', text: 'AI支援ツールは生産性を上げていますか？', cfg: scale5('上げていない', '大幅に上げている') },
      { type: 'text', text: 'AI支援ツールへの要望や不満があれば教えてください' },
    ],
  },
  {
    title: 'OSS（オープンソース）への貢献経験アンケート',
    description: '学生・開発者のOSS活動への参加実態を調べます。',
    required: 15,
    questions: [
      { type: 'single', text: 'OSSへのコントリビューション経験はありますか？', required: true, opts: ['複数回ある', '1回だけある', 'IssueやPRは出したことがない', 'OSSを知らない'] },
      {
        type: 'multiple',
        text: 'コントリビューションした内容をすべて選んでください',
        opts: ['バグ修正', '機能追加', 'ドキュメント修正', '翻訳', 'テスト追加'],
        cond: { sourceQuestionOrder: 0, optionText: '複数回ある' },
      },
      { type: 'paragraph', text: 'OSSに貢献する上でハードルになっていることを教えてください' },
    ],
  },
  {
    title: 'チーム開発でのコミュニケーション方法調査',
    description: '学生プロジェクトでのコミュニケーションツールの使い方を調べます。',
    required: 20,
    questions: [
      { type: 'multiple', text: 'チーム開発で使うツールをすべて選んでください', required: true, opts: ['Slack', 'Discord', 'LINE', 'GitHub Issues', 'Notion'] },
      { type: 'dropdown', text: 'ミーティングの頻度はどれくらいですか？', opts: ['毎日', '週2〜3回', '週1回', '不定期'] },
      { type: 'scale', text: 'チーム内のコミュニケーションは円滑ですか？', cfg: scale5('円滑でない', 'とても円滑') },
      { type: 'text', text: 'チーム開発でうまくいかなかった経験があれば教えてください' },
    ],
  },
  {
    title: 'エンジニア向け勉強会・コミュニティ参加調査',
    description: '技術系コミュニティへの参加状況と関心を調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '技術勉強会やハッカソンに参加したことはありますか？', required: true, opts: ['よく参加する', '数回参加した', '参加したことがない'] },
      { type: 'multiple', text: '参加してみたいイベントの形式をすべて選んでください', opts: ['オンライン勉強会', 'オフラインハッカソン', '輪読会', 'LT会', '特に興味なし'] },
      { type: 'scale', text: 'コミュニティ活動はキャリアに役立つと思いますか？', cfg: scale5('思わない', '強く思う') },
      { type: 'paragraph', text: '参加してよかった/悪かったイベントの経験を教えてください' },
    ],
  },
  {
    title: 'コードレビュー文化に関する調査',
    description: '学生プロジェクトや授業でのコードレビューの実施状況を調べます。',
    required: 15,
    questions: [
      { type: 'single', text: 'コードレビューを受けた経験はありますか？', required: true, opts: ['よく受ける', '数回受けた', '受けたことがない'] },
      {
        type: 'grid',
        text: 'コードレビューについて感じることを教えてください',
        cfg: { rows: ['指摘の的確さ', 'フィードバックの早さ', '心理的なハードル'], columns: ['低い', '普通', '高い'], multiple: false },
      },
      { type: 'paragraph', text: 'レビューを受けて成長を感じた経験があれば教えてください' },
    ],
  },
  {
    title: '個人開発・サイドプロジェクトに関する調査',
    description: '学生エンジニアの個人開発の実態とモチベーションを調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '個人開発（サイドプロジェクト）をしていますか？', required: true, opts: ['継続的にしている', '時々している', '過去にしたことがある', 'したことがない'] },
      { type: 'multiple', text: '個人開発をする理由をすべて選んでください', opts: ['スキルアップ', '就活・ポートフォリオ', '趣味・楽しい', '収益化したい', '課題解決'] },
      { type: 'dropdown', text: '1週間に個人開発に使う時間はどれくらいですか？', opts: ['1時間未満', '1〜3時間', '3〜10時間', '10時間以上'] },
      { type: 'text', text: '作った（作りたい）個人開発プロジェクトを教えてください' },
    ],
  },
  {
    title: 'クラウドサービス利用経験アンケート',
    description: '学習・開発で使ったことのあるクラウドサービスを調べます。',
    required: 20,
    questions: [
      { type: 'multiple', text: '使ったことのあるクラウドサービスをすべて選んでください', required: true, opts: ['AWS', 'Google Cloud', 'Azure', 'Vercel', 'Supabase', 'Firebase', '使ったことがない'] },
      { type: 'single', text: 'クラウドの料金体系に不安を感じますか？', required: true, opts: ['よく感じる', 'たまに感じる', 'あまり感じない'] },
      { type: 'scale', text: 'クラウドサービスの学習の重要度をどう感じますか？', cfg: scale5('重要でない', '非常に重要') },
      { type: 'paragraph', text: 'クラウドサービスを使って困った経験があれば教えてください' },
    ],
  },
  {
    title: 'セキュリティ意識に関する開発者アンケート',
    description: '学生開発者のセキュリティへの意識と実践状況を調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '開発時にセキュリティを意識していますか？', required: true, opts: ['常に意識している', '時々意識している', 'あまり意識していない', '考えたことがない'] },
      {
        type: 'grid',
        text: '次のセキュリティ対策を実践していますか？',
        required: true,
        cfg: { rows: ['環境変数で秘密情報を管理', '入力値のサニタイズ', '依存パッケージの更新', '2段階認証の利用'], columns: ['していない', 'たまにしている', 'している'], multiple: false },
      },
      { type: 'paragraph', text: 'セキュリティについて学びたいことがあれば教えてください' },
    ],
  },
];

// -------------------------------------------------------------
// SQL生成
// -------------------------------------------------------------

function surveySql(survey) {
  const lines = [];
  const deadline = `(current_date + interval '30 days')::date`;
  lines.push(
    `  insert into surveys (user_id, title, description, required_count, deadline, status, sections)` +
      ` values (uid, ${q(survey.title)}, ${qn(survey.description)}, ${survey.required}, ${deadline}, 'open', ${
        survey.sections ? qj(survey.sections) : `'[]'::jsonb`
      }) returning id into sid;`
  );
  survey.questions.forEach((question, i) => {
    lines.push(
      `  insert into questions (survey_id, type, text, description, required, order_index, section_index, config, condition)` +
        ` values (sid, ${q(question.type)}, ${q(question.text)}, ${qn(question.desc)}, ${!!question.required}, ${i}, ${
          question.section ?? 0
        }, ${qj(question.cfg)}, ${qj(question.cond)}) returning id into qid;`
    );
    (question.opts ?? []).forEach((opt, j) => {
      lines.push(`  insert into options (question_id, text, order_index) values (qid, ${q(opt)}, ${j});`);
    });
  });
  lines.push(`  created := created + 1;`);
  return lines.join('\n');
}

function seedBlock(email, surveys) {
  return `do $$
declare
  uid uuid;
  sid uuid;
  qid uuid;
  created int := 0;
begin
  select id into uid from auth.users where email = ${q(email)};
  if uid is null then
    raise exception 'ユーザー % が見つかりません', ${q(email)};
  end if;
${surveys.map(surveySql).join('\n')}
  raise notice '% に % 件作成', ${q(email)}, created;
end $$;`;
}

const deleteAnswerableSql = `do $$
declare
  deleted int;
begin
  delete from surveys
  where status = 'open'
    and (deadline is null or deadline >= current_date);
  get diagnostics deleted = row_count;
  raise notice '回答可能アンケートを % 件削除', deleted;
end $$;`;

async function main() {
  console.log(`▶ プロジェクト: ${ref}`);

  console.log('▶ 回答可能な全アンケートを削除中…');
  await runSql(deleteAnswerableSql);
  console.log('✔ 削除完了');

  console.log('▶ 公式アンケート10件を投入中…');
  await runSql(seedBlock(OFFICIAL_EMAIL, OFFICIAL_SURVEYS));
  console.log('✔ 公式アンケート投入完了');

  console.log(`▶ ${DEVELOPER_EMAIL} のアンケート10件を投入中…`);
  await runSql(seedBlock(DEVELOPER_EMAIL, DEVELOPER_SURVEYS));
  console.log('✔ developerアンケート投入完了');

  const counts = await runSql(
    `select u.email, count(s.id) as surveys from auth.users u join surveys s on s.user_id = u.id where u.email in (${q(OFFICIAL_EMAIL)}, ${q(DEVELOPER_EMAIL)}) group by u.email;`
  );
  console.log('▶ 投入後の件数:', JSON.stringify(counts));
}

main().catch((e) => {
  console.error('✖', e.message);
  process.exit(1);
});
