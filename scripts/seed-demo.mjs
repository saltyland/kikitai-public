// =============================================================
// デモ用アンケート投入スクリプト（ワンショット・冪等）
//
//   node scripts/seed-demo.mjs
//
// やること:
//   1. 公式アカウント（official@kikitai.app / キキタイ公式）が無ければ auth.users に作成
//   2. 公式と zhendayantian@fuji.waseda.jp にそれぞれ10件のアンケートを投入
//      （全8設問タイプ＋セクション＋分岐を網羅。タイトル一致で既存はスキップ＝再実行安全）
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
const OFFICIAL_PASSWORD = 'kikitai-demo-2026';
const USER_EMAIL = 'zhendayantian@fuji.waseda.jp';

/** SQL文字列リテラル用エスケープ */
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (s) => (s == null ? 'null' : q(s));
const qj = (obj) => (obj == null ? 'null' : `${q(JSON.stringify(obj))}::jsonb`);

// -------------------------------------------------------------
// アンケート定義
// question: { type, text, required?, desc?, opts?, cfg?, cond?, section? }
// -------------------------------------------------------------

const scale5 = (minLabel, maxLabel) => ({ min: 1, max: 5, minLabel, maxLabel });

const OFFICIAL_SURVEYS = [
  {
    title: '【公式】キキタイ利用満足度調査',
    description: 'キキタイをより良いサービスにするため、使い心地を教えてください。所要時間は約2分です。',
    required: 30,
    questions: [
      { type: 'scale', text: 'キキタイの総合満足度を教えてください', required: true, cfg: scale5('不満', '大満足') },
      { type: 'single', text: '最もよく使う機能はどれですか？', required: true, opts: ['アンケート作成', 'アンケート回答', '結果の集計・分析', 'ポイント管理'] },
      { type: 'multiple', text: '今後ほしい機能をすべて選んでください', opts: ['スマホアプリ', '回答者の属性ターゲティング', 'チームでの共同編集', '通知機能', '謝礼の現金化'] },
      { type: 'paragraph', text: '改善してほしい点があれば自由にお書きください' },
    ],
  },
  {
    title: '【公式】大学生の睡眠習慣調査',
    description: '大学生の睡眠時間と生活リズムの実態を調べる公式デモアンケートです。',
    required: 20,
    questions: [
      { type: 'single', text: '平日の平均睡眠時間はどれくらいですか？', required: true, opts: ['5時間未満', '5〜6時間', '6〜7時間', '7〜8時間', '8時間以上'] },
      { type: 'dropdown', text: '普段就寝するのは何時頃ですか？', required: true, opts: ['22時前', '22〜24時', '0〜2時', '2〜4時', '4時以降'] },
      { type: 'scale', text: '朝の目覚めの良さを評価してください', cfg: scale5('最悪', '快調') },
      { type: 'text', text: '睡眠の質を上げるために工夫していることがあれば教えてください' },
    ],
  },
  {
    title: '【公式】学食メニュー人気投票',
    description: '学食の新メニュー開発の参考にします。気軽に投票してください。',
    required: 50,
    questions: [
      { type: 'single', text: '学食を利用する頻度は？', required: true, opts: ['ほぼ毎日', '週2〜3回', '週1回', '月に数回', 'ほとんど利用しない'] },
      { type: 'multiple', text: '好きなジャンルをすべて選んでください', required: true, opts: ['丼もの', '麺類', 'カレー', '定食', '洋食', 'サラダ・ヘルシー系'] },
      { type: 'dropdown', text: 'ランチに出せる予算はいくらですか？', opts: ['300円未満', '300〜500円', '500〜700円', '700円以上'] },
      { type: 'text', text: '学食に追加してほしいメニューを一つ挙げてください' },
    ],
  },
  {
    title: '【公式】オンライン授業の受講環境調査',
    description: 'オンライン授業の満足度と受講環境について、グリッド形式の設問で詳しくお聞きします。',
    required: 25,
    questions: [
      { type: 'single', text: '今学期、オンライン授業を受けていますか？', required: true, opts: ['オンデマンド型のみ', 'リアルタイム型のみ', '両方', '受けていない'] },
      {
        type: 'grid',
        text: '次の項目について満足度を教えてください',
        required: true,
        cfg: {
          rows: ['映像・音声の品質', '資料の見やすさ', '質問のしやすさ', '課題の量'],
          columns: ['不満', 'やや不満', '普通', 'やや満足', '満足'],
          multiple: false,
        },
      },
      { type: 'paragraph', text: 'オンライン授業で困った経験を具体的に教えてください' },
    ],
  },
  {
    title: '【公式】SNS利用実態調査',
    description: '大学生のSNS利用時間とプラットフォームの使い分けを調査します。',
    required: 30,
    questions: [
      { type: 'multiple', text: '毎日使うSNSをすべて選んでください', required: true, opts: ['X（旧Twitter）', 'Instagram', 'TikTok', 'YouTube', 'LINE', 'Discord', 'BeReal'] },
      { type: 'dropdown', text: '1日のSNS合計利用時間は？', required: true, opts: ['30分未満', '30分〜1時間', '1〜3時間', '3〜5時間', '5時間以上'] },
      { type: 'scale', text: 'SNSが生活に与える影響はポジティブですか？', cfg: scale5('ネガティブ', 'ポジティブ') },
      { type: 'text', text: '最近SNSをきっかけに購入したものがあれば教えてください' },
    ],
  },
  {
    title: '【公式】通学手段と所要時間の調査',
    description: '通学手段ごとの所要時間と不満点を調べます。日付設問のデモを含みます。',
    required: 20,
    questions: [
      { type: 'single', text: '主な通学手段は何ですか？', required: true, opts: ['電車', 'バス', '自転車', '徒歩', '車・バイク'] },
      { type: 'dropdown', text: '片道の通学時間はどれくらいですか？', required: true, opts: ['15分未満', '15〜30分', '30分〜1時間', '1〜1.5時間', '1.5時間以上'] },
      { type: 'date', text: '今学期、最後に大学へ通学した日はいつですか？' },
      { type: 'paragraph', text: '通学で一番ストレスに感じることを教えてください' },
    ],
  },
  {
    title: '【公式】読書習慣アンケート',
    description: '紙の本と電子書籍、大学生はどう読み分けているのかを調査します。',
    required: 15,
    questions: [
      { type: 'single', text: '月に何冊くらい本を読みますか？（漫画を除く）', required: true, opts: ['0冊', '1冊', '2〜3冊', '4〜5冊', '6冊以上'] },
      { type: 'single', text: '紙の本と電子書籍、どちらをよく使いますか？', required: true, opts: ['紙の本のみ', '紙が多い', '半々', '電子が多い', '電子のみ'] },
      { type: 'scale', text: '読書は生活にどれくらい重要ですか？', cfg: { min: 1, max: 7, minLabel: '重要でない', maxLabel: '非常に重要' } },
      { type: 'text', text: '最近読んで良かった本のタイトルを教えてください' },
    ],
  },
  {
    title: '【公式】生成AIツール活用状況調査',
    description: '学習・研究での生成AIの使われ方を調べます。回答に応じて追加の質問が表示されます（分岐デモ）。',
    required: 30,
    questions: [
      { type: 'single', text: '学習や研究で生成AIを使ったことがありますか？', required: true, opts: ['よく使う', 'たまに使う', '使ったことがない'] },
      {
        type: 'multiple',
        text: 'どの用途で使っていますか？（使う方のみ）',
        opts: ['文章の下書き・推敲', 'プログラミング', '調べもの・要約', '語学学習', 'アイデア出し'],
        cond: { sourceQuestionOrder: 0, optionText: 'よく使う' },
      },
      {
        type: 'paragraph',
        text: '使ったことがない理由を教えてください',
        cond: { sourceQuestionOrder: 0, optionText: '使ったことがない' },
      },
      { type: 'scale', text: '生成AIは今後の学びに必要だと思いますか？', required: true, cfg: scale5('不要', '必須') },
    ],
  },
  {
    title: '【公式】防災意識調査',
    description: '災害への備えについての意識を調査します。',
    required: 25,
    questions: [
      { type: 'single', text: '防災グッズ（非常食・水など）を備えていますか？', required: true, opts: ['しっかり備えている', '一部備えている', '備えていない'] },
      { type: 'multiple', text: '経験したことのある災害をすべて選んでください', opts: ['地震', '台風・豪雨', '大雪', '停電', '断水', '特になし'] },
      {
        type: 'grid',
        text: '次の防災行動について、あてはまるものを選んでください',
        cfg: {
          rows: ['避難場所の確認', '家族との連絡手段の確認', '家具の固定', '防災アプリの利用'],
          columns: ['している', '今後したい', 'する予定はない'],
          multiple: false,
        },
      },
      { type: 'text', text: '防災について知りたい情報があれば教えてください' },
    ],
  },
  {
    title: '【公式】キャンパス施設満足度調査',
    description: '図書館・自習室など学内施設の満足度をセクション分けでお聞きします（セクションデモ）。',
    required: 20,
    sections: [
      { title: '利用状況について', description: 'まずは普段の施設利用についてお聞きします。' },
      { title: '満足度の評価', description: '各施設の満足度を評価してください。' },
    ],
    questions: [
      { type: 'multiple', text: '週1回以上利用する施設をすべて選んでください', required: true, section: 0, opts: ['図書館', '自習室', '学食', 'ジム・体育施設', 'PCルーム', 'ラウンジ'] },
      { type: 'dropdown', text: '大学に滞在する時間は1日平均どれくらいですか？', section: 0, opts: ['2時間未満', '2〜4時間', '4〜6時間', '6〜8時間', '8時間以上'] },
      {
        type: 'grid',
        text: '各施設の満足度を教えてください',
        required: true,
        section: 1,
        cfg: {
          rows: ['図書館', '自習室', '学食', 'トイレ・水回り', 'Wi-Fi環境'],
          columns: ['1（不満）', '2', '3', '4', '5（満足）'],
          multiple: false,
        },
      },
      { type: 'paragraph', text: '施設について改善してほしい点を自由にお書きください', section: 1 },
    ],
  },
  {
    title: '【公式】大学生の推し活・趣味消費調査',
    description: '好きなアイドル・アニメ・スポーツへの消費行動と心理を調べます。',
    required: 25,
    questions: [
      { type: 'single', text: '現在「推し」と呼べる対象がいますか？', required: true, opts: ['いる（1人/1組）', 'いる（複数）', '以前はいたが今はいない', 'いない'] },
      { type: 'multiple', text: '推し活でお金をかけているものをすべて選んでください', opts: ['グッズ購入', 'ライブ・イベント参加', '配信・サブスク課金', '聖地巡礼・遠征', '同人・二次創作購入', '特になし'] },
      { type: 'dropdown', text: '月に推し活に使う金額はどれくらいですか？', opts: ['ほぼ0円', '〜3000円', '3000〜10000円', '10000〜30000円', '30000円以上'] },
      { type: 'scale', text: '推し活は生活の充実につながっていると感じますか？', cfg: scale5('全く感じない', '強く感じる') },
      { type: 'paragraph', text: '推し活をしていて良かったと思った経験を教えてください' },
    ],
  },
  {
    title: '【公式】奨学金・教育費に関する意識調査',
    description: '奨学金の利用状況と返済に対する不安を調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '現在奨学金を受給していますか？', required: true, opts: ['給付型を受けている', '貸与型（無利子）を受けている', '貸与型（有利子）を受けている', '複数種類を受けている', '受けていない'] },
      {
        type: 'multiple',
        text: '奨学金の使い道をすべて選んでください',
        opts: ['授業料・学費', '生活費', '家賃', '教材・PC等', '貯蓄'],
        cond: { sourceQuestionOrder: 0, optionText: '貸与型（無利子）を受けている' },
      },
      { type: 'scale', text: '卒業後の奨学金返済に対して不安はありますか？', required: true, cfg: scale5('全く不安でない', '非常に不安') },
      { type: 'dropdown', text: '月あたりの生活費（食費・家賃含む）はどれくらいですか？', opts: ['5万円未満', '5〜8万円', '8〜12万円', '12〜15万円', '15万円以上'] },
      { type: 'paragraph', text: '教育費・奨学金について感じることを自由にお書きください' },
    ],
  },
  {
    title: '【公式】プログラミング・IT経験調査',
    description: '大学生のプログラミング経験とスキルアップへの意欲を調べます。',
    required: 30,
    questions: [
      { type: 'multiple', text: '使ったことのあるプログラミング言語をすべて選んでください', required: true, opts: ['Python', 'JavaScript / TypeScript', 'Java', 'C / C++', 'R', 'MATLAB', 'その他', '一つもない'] },
      { type: 'single', text: 'プログラミングを始めたきっかけは何ですか？', required: true, opts: ['授業・カリキュラム', '自分で独学', '部活・サークル', 'インターン・アルバイト', 'まだ始めていない'] },
      {
        type: 'grid',
        text: '次のITスキルについて、自己評価してください',
        required: true,
        cfg: {
          rows: ['基本的なPC操作', 'スプレッドシート（Excel/Sheets）', 'プログラミング', 'データ分析', 'AI・機械学習'],
          columns: ['初心者', '基礎あり', '業務レベル', '得意'],
          multiple: false,
        },
      },
      { type: 'scale', text: '今後もITスキルを伸ばしたいと思いますか？', cfg: scale5('思わない', '強く思う') },
      { type: 'paragraph', text: 'プログラミングを学んで困ったこと・役立ったことを教えてください' },
    ],
  },
  {
    title: '【公式】ゼミ・研究室の環境調査',
    description: '所属するゼミや研究室の雰囲気・指導体制について調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '現在ゼミ・研究室に所属していますか？', required: true, opts: ['はい（学部）', 'はい（大学院）', 'まだ所属していない', 'ゼミなし学科'] },
      {
        type: 'grid',
        text: 'ゼミ・研究室の雰囲気について教えてください',
        required: true,
        cfg: {
          rows: ['教員とのコミュニケーションがとりやすい', '学生同士の協力関係がある', '研究に集中できる環境がある', '進捗発表の頻度が適切'],
          columns: ['あてはまらない', 'ややあてはまる', 'あてはまる'],
          multiple: false,
        },
      },
      { type: 'scale', text: '全体的にゼミ・研究室に満足していますか？', cfg: scale5('不満', '大満足') },
      { type: 'paragraph', text: 'ゼミ・研究室で改善してほしい点があれば教えてください' },
    ],
  },
  {
    title: '【公式】友人関係とコミュニケーション調査',
    description: '大学生の友人関係の実態と孤独感について調べます。',
    required: 25,
    questions: [
      { type: 'single', text: '大学での友人の数（よく話す相手）はどれくらいですか？', required: true, opts: ['0人', '1〜2人', '3〜5人', '6〜10人', '11人以上'] },
      { type: 'multiple', text: '友人との主な交流手段をすべて選んでください', required: true, opts: ['直接会う', 'LINE・メッセージ', 'SNS', '通話・ビデオ通話', 'ゲーム・オンライン'] },
      {
        type: 'grid',
        text: '次の場面で困ることはありますか？',
        cfg: {
          rows: ['グループ作業・発表', '授業の質問・相談', '食事・昼休み', '課外活動・イベント'],
          columns: ['困らない', '少し困る', 'よく困る'],
          multiple: false,
        },
      },
      { type: 'scale', text: '大学生活で孤独を感じることがありますか？', cfg: scale5('全くない', 'よくある') },
      { type: 'text', text: '大学でのコミュニティ（サークル等）に求めるものを教えてください' },
    ],
  },
  {
    title: '【公式】留学・海外経験に関する意識調査',
    description: '留学経験の有無と海外への関心度を調べます。経験者には詳しく聞きます（分岐あり）。',
    required: 20,
    questions: [
      { type: 'single', text: '留学（1週間以上の海外滞在）の経験はありますか？', required: true, opts: ['長期留学（3ヶ月以上）', '短期留学（1ヶ月〜3ヶ月未満）', '語学研修程度（1〜4週間）', '経験なし'] },
      {
        type: 'multiple',
        text: '留学して良かったことをすべて選んでください',
        opts: ['語学力向上', '異文化理解', '人脈・友人', '自立心・度胸', 'キャリアへのプラス'],
        cond: { sourceQuestionOrder: 0, optionText: '長期留学（3ヶ月以上）' },
      },
      {
        type: 'paragraph',
        text: '留学しなかった・できなかった理由を教えてください',
        cond: { sourceQuestionOrder: 0, optionText: '経験なし' },
      },
      { type: 'scale', text: '今後、海外で働く・生活することに興味がありますか？', required: true, cfg: scale5('全くない', '強くある') },
      { type: 'dropdown', text: '英語力はどの程度ですか？', opts: ['ほぼ話せない', '日常会話程度', 'ビジネス会話程度', 'ネイティブ近い'] },
    ],
  },
  {
    title: '【公式】授業・カリキュラムへの満足度調査',
    description: '大学の授業内容・教授法・評価方法に対する学生の声を集めます。',
    required: 25,
    sections: [
      { title: '授業の満足度', description: '日常的な授業についてお聞きします。' },
      { title: '評価・カリキュラム', description: '評価方法やカリキュラム構成についてお聞きします。' },
    ],
    questions: [
      { type: 'single', text: '現在の授業全体の満足度は？', required: true, section: 0, opts: ['とても満足', '満足', '普通', '不満', 'とても不満'] },
      {
        type: 'grid',
        text: '授業の各要素を評価してください',
        required: true,
        section: 0,
        cfg: {
          rows: ['教員の説明のわかりやすさ', '資料・スライドの質', '授業の進行ペース', '質問・対話の機会'],
          columns: ['不満', 'やや不満', '普通', 'やや満足', '満足'],
          multiple: false,
        },
      },
      { type: 'multiple', text: '成績評価で重視してほしいものをすべて選んでください', section: 1, opts: ['期末試験', 'レポート・課題', '授業への参加・発言', 'グループワーク', '中間試験'] },
      { type: 'scale', text: 'カリキュラム全体は将来のキャリアに役立つと感じますか？', section: 1, cfg: scale5('役立たない', '役立つ') },
      { type: 'paragraph', text: '授業・カリキュラムについて改善してほしいことを自由にお書きください', section: 1 },
    ],
  },
  {
    title: '【公式】物価高と学生生活への影響調査',
    description: '食費・光熱費の上昇が大学生の生活にどう影響しているかを調べます。',
    required: 20,
    questions: [
      { type: 'single', text: '最近1年で生活費（食費・光熱費等）の負担が増えましたか？', required: true, opts: ['大幅に増えた', 'やや増えた', '変わらない', 'やや減った'] },
      {
        type: 'grid',
        text: '物価高の影響で変えた行動はありますか？',
        required: true,
        cfg: {
          rows: ['外食を減らした', '自炊を増やした', '娯楽・趣味を減らした', 'アルバイトを増やした', '光熱費を節約した'],
          columns: ['していない', 'ややしている', 'かなりしている'],
          multiple: false,
        },
      },
      { type: 'dropdown', text: '月の食費は以前と比べてどう変わりましたか？', opts: ['3000円以上増えた', '1000〜3000円増えた', 'ほぼ変わらない', '減った'] },
      { type: 'scale', text: '現在の生活費に対して経済的なストレスを感じていますか？', cfg: scale5('全く感じない', '強く感じる') },
      { type: 'paragraph', text: '物価高への対策として実践していることを教えてください' },
    ],
  },
  {
    title: '【公式】ボランティア・社会参加意識調査',
    description: '大学生のボランティア活動への参加状況と社会貢献意識を調べます。',
    required: 20,
    sections: [
      { title: '参加状況', description: '実際の活動についてお聞きします。' },
      { title: '意識・考え方', description: 'ボランティアや社会参加への考えを教えてください。' },
    ],
    questions: [
      { type: 'single', text: '大学入学後にボランティア活動に参加したことがありますか？', required: true, section: 0, opts: ['定期的に参加している', '数回参加したことがある', 'ほとんど参加したことがない', '全く参加したことがない'] },
      { type: 'multiple', text: '参加したことのあるボランティアの種類をすべて選んでください', section: 0, opts: ['地域清掃・環境活動', '子ども支援・教育', '高齢者支援', '災害支援', '国際協力', 'スポーツ・イベント運営'] },
      { type: 'dropdown', text: '参加しない・できない主な理由は何ですか？', section: 0, opts: ['時間がない', '情報が少ない', '興味がない', 'きっかけがない', '参加したことがある'] },
      { type: 'scale', text: '社会問題（貧困・環境等）への関心はどれくらいありますか？', section: 1, cfg: scale5('全くない', '強くある') },
      { type: 'paragraph', text: 'ボランティアや社会参加についての考えを自由にお書きください', section: 1 },
    ],
  },
  {
    title: '【公式】メンタルヘルスと相談行動の調査',
    description: '学生のストレスの実態と悩みを相談できる環境があるかを調べます。',
    required: 20,
    questions: [
      { type: 'scale', text: '最近1ヶ月のストレスレベルを教えてください', required: true, cfg: scale5('ほぼなし', '非常に高い') },
      {
        type: 'grid',
        text: '次の項目についてどれくらいあてはまりますか？',
        required: true,
        cfg: {
          rows: ['なかなか眠れないことがある', '気力がわかないことがある', '食欲が落ちることがある', '誰かに話したいが言えないことがある'],
          columns: ['あてはまらない', 'ときどきある', 'よくある'],
          multiple: false,
        },
      },
      { type: 'single', text: '悩みを相談できる相手がいますか？', required: true, opts: ['家族', '友人', '教員・カウンセラー', 'SNS・匿名コミュニティ', '相談できる相手がいない'] },
      { type: 'multiple', text: '大学のメンタルヘルス支援で利用したい・利用したことがあるものを選んでください', opts: ['学生相談室', 'オンラインカウンセリング', '匿名相談チャット', 'セルフケアアプリ', '特になし'] },
      { type: 'paragraph', text: '大学に充実してほしいメンタルヘルス支援があれば教えてください' },
    ],
  },
];

const USER_SURVEYS = [
  {
    title: '研究室のコーヒー文化に関する調査',
    description: '研究室でのカフェイン摂取の実態を調べています。卒論の参考にします。',
    required: 15,
    questions: [
      { type: 'single', text: '作業中によく飲むものは？', required: true, opts: ['コーヒー', '紅茶・お茶', 'エナジードリンク', '水・その他'] },
      { type: 'dropdown', text: '1日に飲むカフェイン飲料の杯数は？', required: true, opts: ['0杯', '1杯', '2〜3杯', '4杯以上'] },
      { type: 'scale', text: 'カフェインで集中力が上がると感じますか？', cfg: scale5('感じない', '強く感じる') },
      { type: 'text', text: 'お気に入りのコーヒー・お茶の銘柄があれば教えてください' },
    ],
  },
  {
    title: 'アルバイトと学業の両立に関する調査',
    description: '大学生のアルバイト時間が学業に与える影響を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '現在アルバイトをしていますか？', required: true, opts: ['している', '以前はしていた', 'したことがない'] },
      { type: 'dropdown', text: '週の労働時間はどれくらいですか？', opts: ['5時間未満', '5〜10時間', '10〜20時間', '20時間以上'], cond: { sourceQuestionOrder: 0, optionText: 'している' } },
      { type: 'scale', text: 'アルバイトが学業の妨げになっていると感じますか？', cfg: scale5('全く感じない', '強く感じる') },
      { type: 'paragraph', text: '両立のために工夫していることを教えてください' },
    ],
  },
  {
    title: '卒業後の進路意識アンケート',
    description: '学部生の進路選択（就職・進学）の意思決定要因を調査しています。',
    required: 25,
    questions: [
      { type: 'single', text: '現時点で考えている進路は？', required: true, opts: ['就職', '大学院進学', '起業・フリーランス', '留学', 'まだ決めていない'] },
      { type: 'multiple', text: '進路選択で重視することをすべて選んでください', required: true, opts: ['収入', 'やりがい', 'ワークライフバランス', '勤務地', '安定性', '成長機会'] },
      { type: 'scale', text: '将来への不安はどれくらいありますか？', cfg: scale5('全くない', '非常に大きい') },
      { type: 'text', text: '進路について今一番知りたい情報は何ですか？' },
    ],
  },
  {
    title: 'スマートフォン依存度セルフチェック',
    description: 'スマホ利用習慣と自覚的な依存度の関係を調べる心理系の調査です。',
    required: 30,
    questions: [
      { type: 'dropdown', text: '1日のスクリーンタイムは平均どれくらいですか？', required: true, opts: ['2時間未満', '2〜4時間', '4〜6時間', '6〜8時間', '8時間以上'] },
      {
        type: 'grid',
        text: '次の行動にどれくらいあてはまりますか？',
        required: true,
        cfg: {
          rows: ['起床後すぐスマホを見る', '食事中もスマホを見る', '就寝直前までスマホを見る', '通知がないのに確認する'],
          columns: ['あてはまらない', 'ややあてはまる', 'あてはまる'],
          multiple: false,
        },
      },
      { type: 'scale', text: '自分はスマホに依存していると思いますか？', cfg: scale5('思わない', '強く思う') },
      { type: 'text', text: 'スマホ利用を減らすために試したことがあれば教えてください' },
    ],
  },
  {
    title: '動画配信サービスの利用状況調査',
    description: 'サブスク動画サービスの契約状況と視聴傾向についての調査です。',
    required: 20,
    questions: [
      { type: 'multiple', text: '現在契約している動画サービスをすべて選んでください', required: true, opts: ['Netflix', 'Amazonプライム', 'Disney+', 'U-NEXT', 'ABEMA', 'dアニメストア', '契約していない'] },
      { type: 'single', text: '動画を見るデバイスで最も多いのは？', required: true, opts: ['スマホ', 'タブレット', 'PC', 'テレビ'] },
      { type: 'dropdown', text: '月に動画サービスへ払ってもよい金額は？', opts: ['500円未満', '500〜1000円', '1000〜2000円', '2000円以上'] },
      { type: 'paragraph', text: '最近見て面白かった作品とその理由を教えてください' },
    ],
  },
  {
    title: '一人暮らし大学生の自炊事情',
    description: '自炊の頻度と食費の関係を調べています。一人暮らし以外の方も回答できます。',
    required: 15,
    questions: [
      { type: 'single', text: '現在の住まいは？', required: true, opts: ['一人暮らし', '実家', '寮・シェアハウス'] },
      { type: 'single', text: '週に何回くらい自炊しますか？', required: true, opts: ['ほぼ毎日', '週4〜5回', '週2〜3回', '週1回以下', 'まったくしない'] },
      { type: 'dropdown', text: '1ヶ月の食費はどれくらいですか？', opts: ['1万円未満', '1〜2万円', '2〜3万円', '3〜4万円', '4万円以上'] },
      { type: 'text', text: 'よく作る定番メニューを一つ教えてください' },
    ],
  },
  {
    title: '試験勉強の方法に関する調査',
    description: '効果的だと感じる勉強法を集めています。期末試験対策の参考にさせてください。',
    required: 20,
    questions: [
      { type: 'single', text: '試験勉強はいつから始めますか？', required: true, opts: ['1ヶ月以上前', '2〜3週間前', '1週間前', '数日前', '前日・当日'] },
      { type: 'multiple', text: 'よく使う勉強場所をすべて選んでください', opts: ['自宅', '図書館', 'カフェ', '大学の自習室', '電車・移動中'] },
      { type: 'date', text: '直近で試験（またはレポート締切）がある日はいつですか？' },
      { type: 'paragraph', text: '自分に一番効果があった勉強法を具体的に教えてください' },
    ],
  },
  {
    title: '旅行の好みに関するアンケート',
    description: '大学生の旅行スタイル（計画派か行き当たりばったり派か）を調査します。',
    required: 15,
    sections: [
      { title: '旅行の頻度', description: '普段の旅行についてお聞きします。' },
      { title: '旅のスタイル', description: 'あなたの旅行の好みを教えてください。' },
    ],
    questions: [
      { type: 'single', text: '年に何回くらい旅行しますか？（日帰り含む）', required: true, section: 0, opts: ['0回', '1〜2回', '3〜5回', '6回以上'] },
      { type: 'dropdown', text: '1回の旅行の予算はどれくらいですか？', section: 0, opts: ['5千円未満', '5千〜1万円', '1〜3万円', '3〜5万円', '5万円以上'] },
      { type: 'single', text: '旅行の計画はどちら派ですか？', required: true, section: 1, opts: ['分単位でしっかり計画する', 'ざっくり決める', 'ほぼ無計画で行く'] },
      { type: 'multiple', text: '旅先で重視するものをすべて選んでください', section: 1, opts: ['グルメ', '絶景・自然', '歴史・文化', '温泉', 'テーマパーク', '買い物'] },
      { type: 'text', text: '今一番行きたい場所はどこですか？', section: 1 },
    ],
  },
  {
    title: '音楽の聴き方に関する調査',
    description: 'ストリーミング時代の音楽の聴き方と発見経路を調べています。',
    required: 20,
    questions: [
      { type: 'single', text: '音楽を聴く主な手段は？', required: true, opts: ['サブスク（Spotify等）', 'YouTube', 'CD・ダウンロード購入', 'ほとんど聴かない'] },
      { type: 'multiple', text: '新しい曲を知るきっかけをすべて選んでください', opts: ['SNS・ショート動画', 'サブスクのおすすめ', '友人の紹介', 'テレビ・ラジオ', 'アニメ・ドラマ'] },
      { type: 'scale', text: '音楽は生活にどれくらい欠かせませんか？', cfg: { min: 1, max: 10, minLabel: 'なくても平気', maxLabel: '絶対に必要' } },
      { type: 'text', text: '最近よく聴いているアーティストを教えてください' },
    ],
  },
  {
    title: '運動習慣と健康意識アンケート',
    description: '大学生の運動頻度と健康意識の実態調査です。体育の課題で使用します。',
    required: 25,
    questions: [
      { type: 'single', text: '週にどれくらい運動しますか？（30分以上の運動）', required: true, opts: ['ほぼ毎日', '週3〜4回', '週1〜2回', '月に数回', 'ほとんどしない'] },
      { type: 'multiple', text: '普段する運動をすべて選んでください', opts: ['ランニング・ウォーキング', '筋トレ', '球技', 'スイミング', 'ヨガ・ストレッチ', 'サイクリング', '特になし'] },
      {
        type: 'grid',
        text: '健康に関する次の習慣はありますか？',
        cfg: {
          rows: ['朝食を毎日食べる', '睡眠を7時間以上とる', '定期的に体重を測る', '健康診断を毎年受ける'],
          columns: ['はい', 'ときどき', 'いいえ'],
          multiple: false,
        },
      },
      { type: 'scale', text: '自分の健康状態に自信がありますか？', required: true, cfg: scale5('自信がない', '自信がある') },
      { type: 'paragraph', text: '運動を続ける（または始められない）理由を教えてください' },
    ],
  },
];

// -------------------------------------------------------------
// SQL生成
// -------------------------------------------------------------

function surveySql(survey) {
  const lines = [];
  const deadline = `(current_date + interval '30 days')::date`;
  lines.push(`  if not exists (select 1 from surveys where user_id = uid and title = ${q(survey.title)}) then`);
  lines.push(
    `    insert into surveys (user_id, title, description, required_count, deadline, status, sections)` +
      ` values (uid, ${q(survey.title)}, ${qn(survey.description)}, ${survey.required}, ${deadline}, 'open', ${
        survey.sections ? qj(survey.sections) : `'[]'::jsonb`
      }) returning id into sid;`
  );
  survey.questions.forEach((question, i) => {
    lines.push(
      `    insert into questions (survey_id, type, text, description, required, order_index, section_index, config, condition)` +
        ` values (sid, ${q(question.type)}, ${q(question.text)}, ${qn(question.desc)}, ${!!question.required}, ${i}, ${
          question.section ?? 0
        }, ${qj(question.cfg)}, ${qj(question.cond)}) returning id into qid;`
    );
    (question.opts ?? []).forEach((opt, j) => {
      lines.push(`    insert into options (question_id, text, order_index) values (qid, ${q(opt)}, ${j});`);
    });
  });
  lines.push(`    created := created + 1;`);
  lines.push(`  end if;`);
  return lines.join('\n');
}

function seedBlock(emailVar, surveys) {
  return `do $$
declare
  uid uuid;
  sid uuid;
  qid uuid;
  created int := 0;
begin
  select id into uid from auth.users where email = ${q(emailVar)};
  if uid is null then
    raise exception 'ユーザー % が見つかりません', ${q(emailVar)};
  end if;
${surveys.map(surveySql).join('\n')}
  raise notice '% に % 件作成', ${q(emailVar)}, created;
end $$;`;
}

const createOfficialSql = `do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = ${q(OFFICIAL_EMAIL)};
  if uid is null then
    uid := gen_random_uuid();
    -- トークン系の列はNULLだとGoTrueのログインが500になるため空文字で埋める
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      ${q(OFFICIAL_EMAIL)}, extensions.crypt(${q(OFFICIAL_PASSWORD)}, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nickname":"キキタイ公式","affiliation":"キキタイ運営"}'::jsonb,
      now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', ${q(OFFICIAL_EMAIL)}, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
end $$;`;

async function main() {
  console.log(`▶ プロジェクト: ${ref}`);

  console.log('▶ 公式アカウントを確認・作成中…');
  await runSql(createOfficialSql);
  console.log(`✔ 公式アカウント: ${OFFICIAL_EMAIL}（パスワード: ${OFFICIAL_PASSWORD}）`);

  console.log('▶ 公式アンケート10件を投入中…');
  await runSql(seedBlock(OFFICIAL_EMAIL, OFFICIAL_SURVEYS));
  console.log('✔ 公式アンケート投入完了');

  console.log(`▶ ${USER_EMAIL} のアンケート10件を投入中…`);
  await runSql(seedBlock(USER_EMAIL, USER_SURVEYS));
  console.log('✔ ユーザーアンケート投入完了');

  const counts = await runSql(
    `select u.email, count(s.id) as surveys from auth.users u join surveys s on s.user_id = u.id where u.email in (${q(OFFICIAL_EMAIL)}, ${q(USER_EMAIL)}) group by u.email;`
  );
  console.log('▶ 投入後の件数:', JSON.stringify(counts));
}

main().catch((e) => {
  console.error('✖', e.message);
  process.exit(1);
});
