/**
 * 非LLMのテキスト特徴量ユーティリティ（設計書 §4.2 B-1 / §13.2 補正3）。
 *
 * B-1（強化ルールベース）と参照ベクトル（コピペ判定）の双方から再利用する。
 * 形態素解析器に依存せず、表層的なヒューリスティクスで「内容語」「情報量」
 * 「設問文との近さ（編集距離 / SimHash）」を粗く近似する。
 *
 * 注意: あくまで近似であり、これ単独で破棄判断には使わない（合算原則・§13.2 補正1）。
 */

/** 定型句辞書。これらが回答の主成分だと情報量が乏しいとみなす（§4.2 B-1 情報量）。 */
export const FORMULAIC_PHRASES: readonly string[] = [
  '特になし',
  '特に無し',
  'とくになし',
  'なし',
  '無し',
  'わからない',
  'わかりません',
  '分からない',
  '分かりません',
  'いいと思う',
  '良いと思う',
  'いいと思います',
  '良いと思います',
  'よい',
  'ふつう',
  '普通',
  'どちらでもない',
  'どちらともいえない',
  'これから',
  'あとで',
  'なんでもいい',
  '何でもいい',
  'ありません',
  'noidea',
  'na',
  'n/a',
  'none',
  'nothing',
];

/** 全角→半角・小文字化・空白圧縮など、比較用に表記を正規化する。 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 内容語候補を粗く抽出する（形態素解析なし）。
 *  - 漢字の連続（2文字以上）
 *  - カタカナの連続（2文字以上）
 *  - 英数字の語（2文字以上）
 * 助詞・記号・1文字ひらがなはノイズとして落とす近似。
 */
export function extractContentWords(text: string): string[] {
  const norm = normalizeText(text);
  const matches =
    norm.match(/[一-龯々々]{2,}|[゠-ヿー]{2,}|[a-z0-9][a-z0-9]+/g) ?? [];
  return matches;
}

/** ユニークな内容語の集合を返す。 */
export function uniqueContentWords(text: string): Set<string> {
  return new Set(extractContentWords(text));
}

/**
 * 定型句率：正規化後テキストに占める定型句マッチ文字数の割合（0〜1）。
 * 1に近いほど「特になし」等の中身の薄い回答。
 */
export function formulaicRatio(text: string): number {
  const norm = normalizeText(text).replace(/[\s。、.,!?！？]/g, '');
  if (norm.length === 0) return 1;
  // 定型句のみで構成されるか（完全一致）を最優先で判定
  for (const p of FORMULAIC_PHRASES) {
    if (norm === normalizeText(p).replace(/[\s。、.,!?！？]/g, '')) return 1;
  }
  let matched = 0;
  for (const p of FORMULAIC_PHRASES) {
    const np = normalizeText(p).replace(/[\s。、.,!?！？]/g, '');
    if (np.length === 0) continue;
    let idx = norm.indexOf(np);
    while (idx !== -1) {
      matched += np.length;
      idx = norm.indexOf(np, idx + np.length);
    }
  }
  return Math.min(1, matched / norm.length);
}

/**
 * 設問キーワード被覆率（§4.2 B-1）：設問文の内容語のうち、回答に表層的に
 * 反映されている割合（0〜1）。表層一致のみの粗い近似。
 * 設問に内容語が無い場合は判定不能として null を返す。
 */
export function keywordCoverage(questionText: string, answerText: string): number | null {
  const qWords = [...uniqueContentWords(questionText)];
  if (qWords.length === 0) return null;
  const aNorm = normalizeText(answerText);
  if (aNorm.length === 0) return 0;
  const hit = qWords.filter((w) => aNorm.includes(w)).length;
  return hit / qWords.length;
}

/** レーベンシュタイン編集距離（短文向けの素朴なDP実装）。 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * 正規化編集類似度（0〜1。1＝完全一致）。
 * 設問文の丸写し（コピペ）検出に使う（§13.2 補正3）。
 */
export function editSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

/** 文字列の決定論的な64bitハッシュ（FNV-1a 変種）。SimHash用。 */
function hash64(s: string): bigint {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h;
}

/** 文字3-gramのシングル集合を作る（SimHash / 近傍重複用）。 */
function shingles(text: string, k = 3): string[] {
  const norm = normalizeText(text).replace(/\s/g, '');
  if (norm.length <= k) return norm.length ? [norm] : [];
  const out: string[] = [];
  for (let i = 0; i + k <= norm.length; i++) out.push(norm.slice(i, i + k));
  return out;
}

/**
 * 簡易64bit SimHash（§4.2 B-1 コピペ/近傍重複）。
 * 回答間の近傍重複（コピペ回答の使い回し）検出に使う。
 */
export function simHash64(text: string): bigint {
  const v = new Array<number>(64).fill(0);
  const grams = shingles(text);
  if (grams.length === 0) return 0n;
  for (const g of grams) {
    const h = hash64(g);
    for (let b = 0; b < 64; b++) {
      v[b] += (h >> BigInt(b)) & 1n ? 1 : -1;
    }
  }
  let out = 0n;
  for (let b = 0; b < 64; b++) {
    if (v[b] > 0) out |= 1n << BigInt(b);
  }
  return out;
}

/** 2つのSimHashのハミング距離（0〜64。小さいほど類似）。 */
export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x) {
    x &= x - 1n;
    count++;
  }
  return count;
}
