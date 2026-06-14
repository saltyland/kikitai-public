import { cosineSimilarity, type ILocalEncoder } from './embedding/encoder';
import { editSimilarity } from './embedding/text';

/**
 * 参照ベクトル方式（設計書 §13.2「作成時に参照を生成 → 回答はローカルで近さ判定」）。
 *
 * 高コストなLLM呼び出しを「回答ごと」から「アンケート作成ごと」へ移すための仕組み。
 * 作成時に各設問の参照（キー概念・理想回答の例文・設問文）をローカルエンコーダで
 * ベクトル化して保存し、回答時はローカルで近さ（関連性）だけを測る。
 *
 * ── 3つの補正（厳守）───────────────────────────────────────────
 *  補正1（守備範囲）: 返すのは「関連性」軸のみ。AI生成の上手い回答・手抜きは
 *      別軸（機械層シグナル）で取る。**これ単独で破棄判断には使わない**。
 *  補正2（空間の一致）: 参照と回答は必ず同一エンコーダ。`encoderId` を刻み、
 *      利用時に一致を検証する。食い違えば判定を放棄（安全側）。
 *  補正3（正解の幅）: 参照は領域化（複数アンカー）＋ゆるい閾値。
 *      設問文への高類似（丸写し）は良回答にしない＝コピペ判定は機械層を尊重し、
 *      ここでは高類似を一律PASSにせず copy フラグを立てるだけ（破棄はしない）。
 */

/** 1設問ぶんの参照ベクトル群（DBの surveys.reference_vectors に保存）。 */
export interface QuestionReference {
  /** 設問の order_index（保存時の設問位置）。 */
  questionOrder: number;
  /** 設問文そのもの（表層の丸写し検出に使う。補正3）。 */
  questionText: string;
  /** 設問文そのもののベクトル（意味的な丸写し検出に使う。補正3）。 */
  questionVector: number[];
  /** 理想回答の例文ベクトル群（領域化＝複数アンカー。補正3）。 */
  anchors: number[][];
  /** キー概念のベクトル群（任意。off-topic判定の補助）。 */
  keyConcepts?: number[][];
}

/** アンケート1件ぶんの参照ベクトル集合（jsonb 保存形）。 */
export interface SurveyReferenceVectors {
  /** 生成に使ったエンコーダの一意識別子（補正2の空間一致検証用）。 */
  encoderId: string;
  /** ベクトル次元（保存形の健全性チェック用）。 */
  dim: number;
  /** 生成時刻（ISO8601）。 */
  generatedAt: string;
  /** 設問ごとの参照。 */
  questions: QuestionReference[];
}

/** 参照生成の入力（設問1問ぶん）。 */
export interface ReferenceSource {
  questionOrder: number;
  /** 設問文（必須）。 */
  questionText: string;
  /** 理想回答の例文（任意。複数推奨＝領域化）。空なら設問文＋概念のみで領域化する。 */
  idealAnswers?: string[];
  /** キー概念（任意。設問文の説明・観点など）。 */
  keyConcepts?: string[];
}

/** 関連性判定の結果（補正1: 返すのは関連性軸のみ）。 */
export interface RelevanceResult {
  /** 参照領域への最大コサイン類似度（0〜1にクランプ）。高いほど関連。 */
  relevance: number;
  /** ゆるい閾値での「関連していそうか」（補正3）。off-topic検出の参考。 */
  onTopic: boolean;
  /** 設問文への高類似＝丸写しの疑い（補正3）。**破棄はしない／機械層が判断**。 */
  likelyCopy: boolean;
  /** 参照が無い・空間不一致などで判定不能なら true（安全側＝減点しない）。 */
  indeterminate: boolean;
}

/** ゆるい閾値（補正3）。多様な正答を誤検知しないため低めに置く。要較正（§13.3）。 */
export const ON_TOPIC_THRESHOLD = 0.25;
/** 設問文との高類似＝丸写しとみなす編集類似度の閾値（補正3）。 */
export const COPY_EDIT_SIMILARITY_THRESHOLD = 0.85;

/**
 * 作成・公開時に各設問の参照ベクトル群を生成する（§13.2 作成フェーズ）。
 * 参照はすべて引数の `encoder` で埋め込む（補正2＝同一空間）。
 * 外部LLMにテキスト生成させる版は任意。最小は設問文（＋作成者の理想回答）から生成する。
 */
export async function buildReferenceVectors(
  encoder: ILocalEncoder,
  sources: ReferenceSource[]
): Promise<SurveyReferenceVectors> {
  const questions: QuestionReference[] = [];
  for (const src of sources) {
    const questionVector = await encoder.embed(src.questionText);

    // 領域化（補正3）：理想回答例文を複数アンカーに。空なら設問文自身を最小アンカーに退避。
    const anchorTexts = (src.idealAnswers ?? []).map((t) => t.trim()).filter((t) => t.length > 0);
    const anchors =
      anchorTexts.length > 0
        ? await encoder.embedBatch(anchorTexts)
        : [questionVector];

    const conceptTexts = (src.keyConcepts ?? []).map((t) => t.trim()).filter((t) => t.length > 0);
    const keyConcepts = conceptTexts.length > 0 ? await encoder.embedBatch(conceptTexts) : undefined;

    questions.push({
      questionOrder: src.questionOrder,
      questionText: src.questionText,
      questionVector,
      anchors,
      keyConcepts,
    });
  }

  return {
    encoderId: encoder.id,
    dim: encoder.dim,
    generatedAt: new Date().toISOString(),
    questions,
  };
}

/**
 * 回答の「関連性」を参照領域との近さで測る（§13.2 回答フェーズ・補正1）。
 *
 * 返すのは関連性軸のみ。likelyCopy フラグは立てるが破棄はしない（補正3＝機械層が判断）。
 * 空間不一致・参照欠如時は indeterminate=true を返し、呼び出し側は減点しない（安全側）。
 */
export function scoreRelevance(
  encoder: ILocalEncoder,
  answerEmbedding: number[],
  answerText: string,
  refs: SurveyReferenceVectors | null,
  questionOrder: number
): RelevanceResult {
  const safe: RelevanceResult = {
    relevance: 0,
    onTopic: true, // 判定不能時は「関連あり」とみなして減点しない（安全側）
    likelyCopy: false,
    indeterminate: true,
  };
  if (!refs) return safe;

  // 補正2: 空間が一致しない（別エンコーダ・別次元）なら判定を放棄する。
  if (refs.encoderId !== encoder.id || refs.dim !== encoder.dim) {
    console.warn(
      `[referenceVector] 空間不一致のため関連性判定を放棄: ref=${refs.encoderId}/${refs.dim} enc=${encoder.id}/${encoder.dim}`
    );
    return safe;
  }
  if (answerEmbedding.length !== encoder.dim) return safe;

  const qref = refs.questions.find((q) => q.questionOrder === questionOrder);
  if (!qref || qref.anchors.length === 0) return safe;

  // 補正3: 領域化＝複数アンカーへの最大類似度を関連性とする。
  let maxSim = -1;
  for (const anchor of qref.anchors) {
    if (anchor.length !== encoder.dim) continue;
    maxSim = Math.max(maxSim, cosineSimilarity(answerEmbedding, anchor));
  }
  // キー概念があれば補助的に加味（最大値で底上げ）。
  if (qref.keyConcepts) {
    for (const c of qref.keyConcepts) {
      if (c.length !== encoder.dim) continue;
      maxSim = Math.max(maxSim, cosineSimilarity(answerEmbedding, c));
    }
  }
  if (maxSim < -1) return safe;

  const relevance = Math.max(0, Math.min(1, maxSim));

  // 補正3: 設問文への高類似＝丸写しの疑い（破棄はせず copy フラグのみ＝機械層が判断）。
  // ベクトル類似に加え、設問文が渡された場合は表層の編集類似でも見る。
  const copyByVector =
    qref.questionVector.length === encoder.dim &&
    cosineSimilarity(answerEmbedding, qref.questionVector) >= 0.97;
  const copyBySurface =
    qref.questionText != null &&
    editSimilarity(answerText, qref.questionText) >= COPY_EDIT_SIMILARITY_THRESHOLD;
  const likelyCopy = copyByVector || copyBySurface;

  return {
    relevance,
    onTopic: relevance >= ON_TOPIC_THRESHOLD,
    likelyCopy,
    indeterminate: false,
  };
}
