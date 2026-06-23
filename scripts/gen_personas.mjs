/**
 * 100ペルソナ・ベンチマーク生成器（決定論的）。
 *
 * 採点パイプラインの「通過率（pass-rate）」を継続評価するための固定ベンチマークを生成し、
 * `lib/domain/quality/benchmark/personas.json` に保存する。
 * シード固定のため毎回同一出力 → git で凍結＝回帰テストの基準になる。
 *
 * 実行: node scripts/gen_personas.mjs
 *
 * 出力スキーマ:
 *   { version, generatedAt, survey:{questions[]}, referenceSources[], personas[] }
 *   persona = { id, name, archetype, shouldFlag, note, durationSec, answers:{ [order]: {text|opt} } }
 *     - shouldFlag: 低品質で満額付与すべきでない＝true（グラウンドトゥルース）
 *     - answers[order] = { text:string }            （text/paragraph）
 *                      | { opt:number }             （scale/attention: 選択肢index）
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../lib/domain/quality/benchmark/personas.json');

// ───────── 決定論的 PRNG（mulberry32）─────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260623);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickN = (arr, n) => {
  const c = [...arr];
  const out = [];
  for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
  return out;
};
const ri = (min, max) => min + Math.floor(rnd() * (max - min + 1));

// ───────── ベンチマーク用アンケート（固定）─────────
const SCALE = ['1', '2', '3', '4', '5'];
const survey = {
  questions: [
    { order: 0, type: 'paragraph', text: '普段の業務で最も課題に感じていることを、具体的な場面を交えて教えてください。' },
    { order: 1, type: 'paragraph', text: 'その課題に対して現在工夫していることがあれば具体的に教えてください。' },
    { order: 2, type: 'text', text: 'あなたの職種・役割を簡単に教えてください。' },
    { order: 3, type: 'scale', text: 'この製品の使い勝手に満足していますか。', options: SCALE },
    { order: 4, type: 'scale', text: '価格は妥当だと感じますか。', options: SCALE },
    { order: 5, type: 'scale', text: '同僚にこの製品を勧めたいと思いますか。', options: SCALE },
    { order: 6, type: 'attention', text: 'これは注意確認です。選択肢の中から「3」を選んでください。', options: SCALE, correct: '3' },
    { order: 7, type: 'paragraph', text: '今後改善してほしい点があれば具体的に教えてください。' },
  ],
};
const ATTENTION_CORRECT_INDEX = 2; // '3'

// 参照（理想回答）。buildReferenceVectors に渡す → baseline 等方化＋関連性アンカーに使う。
// アンカーは「想定される良質回答の空間」を広めに覆うほど、正当な言い換えを誤検知しにくい。
// ここでは各設問の文面プール全体をアンカーにする（＝作成者が良質な参照例を十分用意した状態）。
// 定義は下の POOL_* の後（ファイル末尾付近）で行う。プレースホルダを置く。
let referenceSources = [];

// ───────── 文面プール ─────────
// 設問0（課題）— 業務課題の具体文
const POOL_Q0 = [
  '月末に複数案件の締め切りが重なると優先順位の判断が難しく、上長のレビュー待ちで半日作業が止まることがあります。',
  '会議が一日に何件も入りまとまった開発時間が取れず、設計ドキュメントの更新が後回しになっています。',
  '仕様変更が口頭やチャットで断片的に来るため、後から認識の齟齬が判明して手戻りが頻発します。',
  '属人化が進んでいて、担当者が休むとその案件が完全に止まってしまうのが一番の課題です。',
  '問い合わせ対応に追われて本来の開発に集中できず、夕方になってようやく自分の作業に入れます。',
  'テスト環境の準備に時間がかかり、検証のたびに環境構築からやり直すのが地味に大きな負担です。',
  '営業からの見積もり依頼が急ぎばかりで、根拠資料を整える時間がなく精度が落ちています。',
  'データの集計を手作業のエクセルでやっており、毎週の定例レポート作成に半日溶けています。',
];
// 設問1（工夫）
const POOL_Q1 = [
  '毎朝チケットを棚卸しして優先度を三段階で付け、午前中は会議を入れない集中時間を確保しています。',
  'よく使う手順をテンプレート化し、定型作業はスクリプトで自動化して時間を捻出しています。',
  '仕様は必ずドキュメントに残し、変更があれば履歴を添えて関係者に共有するルールにしました。',
  'ペア作業や勉強会で知識を共有し、属人化を減らすよう少しずつ引き継ぎ資料を整えています。',
  '問い合わせは時間帯を決めてまとめて対応し、開発の集中時間を細切れにしないようにしています。',
  '検証用の環境をDockerでコード化し、ワンコマンドで立ち上がるようにして準備時間を削りました。',
];
// 設問7（改善要望）
const POOL_Q7 = [
  '通知が多すぎて重要なものを見逃すので、重要度でフィルタリングできる設定がほしいです。',
  '検索が遅く目的の情報にたどり着きにくいので、検索速度と絞り込み精度を上げてほしいです。',
  'モバイルアプリの動作が重いため軽量化と、オフラインでも閲覧できる機能を希望します。',
  'CSVや表計算へのエクスポート機能があると、社内での二次集計がとても楽になります。',
  'キーボードショートカットを拡充して、マウスを使わず一連の操作を完結できるようにしてほしいです。',
  '権限設定が細かすぎて分かりにくいので、よくある構成のテンプレートを用意してほしいです。',
];
// 職種（短文Q2）
const POOL_ROLE = ['ソフトウェアエンジニア', 'プロダクトマネージャー', '営業', 'カスタマーサポート', 'データアナリスト', '研究職', '人事', 'デザイナー', '経理', 'マーケティング担当'];

// 的外れ（off-topic）プール
const POOL_OFFTOPIC = [
  '昨日の夜ご飯はカレーで、とても美味しかったので大満足です。週末は家族で旅行に行く予定です。',
  '最近は天気が良くて散歩が気持ちいいです。先月から猫を飼い始めてとても癒されています。',
  '好きな映画はアクションもので、週末はよく映画館に足を運びます。新作が楽しみです。',
  '今年の夏は海に行きたいと思っています。日焼け止めを買い替えなければいけません。',
  '昨日見たドラマの展開が面白くて、続きが気になって夜更かししてしまいました。',
  '近所に新しくできたラーメン屋が美味しいと評判なので、今度行ってみようと思います。',
  '最近ジョギングを始めました。毎朝五キロ走ると一日が気持ちよく過ごせます。',
  '来月の連休はどこに出かけようか、家族と相談しているところです。温泉もいいですね。',
];
// AI生成・一般論（流暢だが中身なし）
const POOL_AIGENERIC = [
  '業務における課題は多岐にわたりますが、効率化とコミュニケーションの最適化が重要だと考えています。日々の改善を積み重ねることが大切です。',
  '全体として良い取り組みだと思います。今後も継続的な改善を通じて、より良い成果を目指していくことが肝要です。',
  '柔軟性とスピード感を持って対応することが求められます。チーム全体で連携を取りながら進めることが成功の鍵となります。',
  '生産性の向上には、適切なプロセスの整備とメンバーの主体性が欠かせません。バランスの取れた運営を心がけたいです。',
  'さまざまな観点から総合的に判断することが大切だと感じています。今後の発展に大いに期待しています。',
  '変化の激しい時代においては、常に学び続け、価値を提供し続ける姿勢が重要であると認識しています。',
];
// 定型句（無内容）
const POOL_FORMULAIC = ['特にありません', 'なし', 'わかりません', 'いいと思います', '普通です', 'どちらでもない', '特になし'];
// 極短文
const POOL_SHORT = ['忙しい', '時間', '大変', 'うーん', 'まあまあ', '微妙'];
// 乱文（gibberish）
function gibberish() {
  const bank = 'あasdfqwerトテstてきとう12345zxcvbんかきくけ98765aaabbbccc';
  let s = '';
  const n = ri(8, 22);
  for (let i = 0; i < n; i++) s += bank[Math.floor(rnd() * bank.length)];
  return s;
}

// 参照アンカーを各設問の文面プールで定義（プールが出揃ったこの位置で確定）。
referenceSources = [
  { questionOrder: 0, questionText: survey.questions[0].text, idealAnswers: [...POOL_Q0] },
  { questionOrder: 1, questionText: survey.questions[1].text, idealAnswers: [...POOL_Q1] },
  { questionOrder: 7, questionText: survey.questions[7].text, idealAnswers: [...POOL_Q7] },
];

// 1〜3文を結合して genuine 回答を作る（軽い多様化）
function genuine(pool) {
  const n = ri(1, 3);
  return pickN(pool, n).join('');
}

// ───────── ペルソナ生成 ─────────
const personas = [];
let seq = 0;
function add(archetype, shouldFlag, note, durationSec, answers) {
  personas.push({
    id: `p${String(++seq).padStart(3, '0')}`,
    name: `${archetype}#${seq}`,
    archetype,
    shouldFlag,
    note,
    durationSec,
    answers,
  });
}
// 良質回答のスケール（多様・直線でない）。3つが全て同じ値になるのを避ける。
function variedScales() {
  let a, b, c;
  do { a = ri(0, 4); b = ri(0, 4); c = ri(0, 4); } while (a === b && b === c);
  return { 3: { opt: a }, 4: { opt: b }, 5: { opt: c }, 6: { opt: ATTENTION_CORRECT_INDEX } };
}

// --- 良質：豊富（26）---
for (let i = 0; i < 26; i++) {
  add('genuine_rich', false, '具体的で誠実な回答', ri(150, 400), {
    0: { text: genuine(POOL_Q0) }, 1: { text: genuine(POOL_Q1) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: genuine(POOL_Q7) },
  });
}
// --- 良質：簡潔だが的確（10）。短めだが on-topic。flagすべきでない ---
for (let i = 0; i < 10; i++) {
  add('genuine_moderate', false, '簡潔だが主旨に沿った回答', ri(90, 200), {
    0: { text: pick(POOL_Q0) }, 1: { text: pick(POOL_Q1) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_Q7) },
  });
}
// --- 定型・無内容（8）---
for (let i = 0; i < 8; i++) {
  add('empty_formulaic', true, '無内容な定型句の連発', ri(15, 60), {
    0: { text: pick(POOL_FORMULAIC) }, 1: { text: pick(POOL_FORMULAIC) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_FORMULAIC) },
  });
}
// --- 極短文（6）---
for (let i = 0; i < 6; i++) {
  add('too_short', true, '極端に短い自由記述', ri(20, 70), {
    0: { text: pick(POOL_SHORT) }, 1: { text: pick(POOL_SHORT) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_SHORT) },
  });
}
// --- 設問丸写し（6）---
for (let i = 0; i < 6; i++) {
  add('question_copy', true, '設問文をそのままコピペ', ri(30, 90), {
    0: { text: survey.questions[0].text }, 1: { text: survey.questions[1].text },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: survey.questions[7].text },
  });
}
// --- 的外れ（8）---
for (let i = 0; i < 8; i++) {
  add('off_topic', true, '設問と無関係な話題', ri(40, 120), {
    0: { text: pick(POOL_OFFTOPIC) }, 1: { text: pick(POOL_OFFTOPIC) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_OFFTOPIC) },
  });
}
// --- AI生成・一般論（8）---
for (let i = 0; i < 8; i++) {
  add('ai_generic', true, '流暢だが中身のない一般論', ri(60, 150), {
    0: { text: pick(POOL_AIGENERIC) }, 1: { text: pick(POOL_AIGENERIC) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_AIGENERIC) },
  });
}
// --- 使い回し（6）。同じ長文を全paragraphにコピペ ---
for (let i = 0; i < 6; i++) {
  const dup = pick(POOL_Q0);
  add('duplicated', true, '同一文を全設問にコピペ', ri(40, 120), {
    0: { text: dup }, 1: { text: dup }, 2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: dup },
  });
}
// --- 乱文（6）---
for (let i = 0; i < 6; i++) {
  add('gibberish', true, '意味のない文字列', ri(20, 80), {
    0: { text: gibberish() }, 1: { text: gibberish() },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: gibberish() },
  });
}
// --- 直線回答（5）。スケール全部同じ＋埋めるだけの自由記述 ---
for (let i = 0; i < 5; i++) {
  const v = ri(0, 4);
  add('straight_line', true, 'スケール一直線＋穴埋め', ri(20, 60), {
    0: { text: pick(POOL_FORMULAIC) }, 1: { text: pick(POOL_FORMULAIC) }, 2: { text: pick(POOL_ROLE) },
    3: { opt: v }, 4: { opt: v }, 5: { opt: v }, 6: { opt: ATTENTION_CORRECT_INDEX }, 7: { text: pick(POOL_FORMULAIC) },
  });
}
// --- 爆速（5）。on-topicだが所要時間が極端に短い ---
for (let i = 0; i < 5; i++) {
  add('speed_run', true, '所要時間が極端に短い', ri(3, 9), {
    0: { text: pick(POOL_Q0) }, 1: { text: pick(POOL_Q1) },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_Q7) },
  });
}
// --- 注意失敗（4）。中身は良いがアテンション誤答 ---
for (let i = 0; i < 4; i++) {
  let wrong = ri(0, 4); if (wrong === ATTENTION_CORRECT_INDEX) wrong = (wrong + 1) % 5;
  add('attention_fail', true, 'アテンションチェック誤答', ri(120, 300), {
    0: { text: genuine(POOL_Q0) }, 1: { text: genuine(POOL_Q1) }, 2: { text: pick(POOL_ROLE) },
    3: { opt: ri(1, 4) }, 4: { opt: ri(0, 4) }, 5: { opt: ri(1, 4) }, 6: { opt: wrong }, 7: { text: genuine(POOL_Q7) },
  });
}
// --- ばらまき的外れ＋乱文混在（2）---
for (let i = 0; i < 2; i++) {
  add('off_topic', true, '無関係＋乱文の混在', ri(30, 90), {
    0: { text: pick(POOL_OFFTOPIC) }, 1: { text: gibberish() },
    2: { text: pick(POOL_ROLE) }, ...variedScales(), 7: { text: pick(POOL_OFFTOPIC) },
  });
}

// 合計確認
if (personas.length !== 100) {
  console.error(`ペルソナ数が100ではありません: ${personas.length}`);
  process.exit(1);
}

const payload = {
  version: '1.0',
  generatedAt: '2026-06-23T00:00:00Z', // 固定（決定論性のため）
  seed: 20260623,
  survey,
  referenceSources,
  attentionCorrectIndex: ATTENTION_CORRECT_INDEX,
  personas,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');
const flagged = personas.filter((p) => p.shouldFlag).length;
console.log(`生成完了: ${personas.length}件 → ${OUT}`);
console.log(`  shouldFlag=true(低品質): ${flagged}件 / false(良質): ${personas.length - flagged}件`);
