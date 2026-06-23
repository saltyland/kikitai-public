import type {
  EvaluationContext,
  EvaluationItem,
  IQualityEvaluator,
  QualityResult,
} from './types';
import {
  editSimilarity,
  formulaicRatio,
  hammingDistance,
  keywordCoverage,
  simHash64,
  uniqueContentWords,
} from './embedding/text';

/** 1設問あたりこの秒数を下回るペースの回答は「速すぎる」とみなす */
const MIN_SECONDS_PER_QUESTION = 4;
/** 速すぎる回答の減点 */
const TOO_FAST_PENALTY = 30;
/** 選択式の直線回答（全問同じ位置の選択肢）を判定する最低設問数 */
const STRAIGHT_LINE_MIN_QUESTIONS = 5;

/** B-1: 情報量・被覆率・コピペ判定を適用する自由記述の最低文字数（短文は既存ルールが担当） */
const MIN_TEXT_LEN_FOR_CONTENT_RULES = 10;
/** B-1: 定型句率がこれ以上なら「中身が薄い」とみなす */
const FORMULAIC_RATIO_THRESHOLD = 0.8;
/** B-1: 定型句中心の回答の減点 */
const FORMULAIC_PENALTY = 10;
/** B-1: 設問キーワード被覆率がこれ未満かつユニーク内容語が乏しいと off-topic 寄りとみなす */
const LOW_COVERAGE_THRESHOLD = 0.0;
/** B-1: off-topic 寄り（被覆ゼロ＋内容語僅少）の減点 */
const OFF_TOPIC_PENALTY = 10;
/** B-1: 設問文の丸写し（編集類似）の閾値 */
const COPY_QUESTION_SIMILARITY = 0.85;
/** B-1: 設問文の丸写しの減点 */
const COPY_QUESTION_PENALTY = 15;
/** B-1: 回答どうしの近傍重複（SimHashハミング距離）の閾値。小さいほど厳しい */
const NEAR_DUP_HAMMING_THRESHOLD = 6;

/**
 * ルールベースの品質評価器（DESIGN_SPEC §2）。
 * 外部APIに依存せず常に動作するフォールバック実装。
 *
 * ルール:
 *  1. アテンションチェック（正解指定のある設問）に不正解 → 即座にスコア0
 *  2. 短すぎるテキスト回答（10文字未満） → -20点
 *  3. 数値スケールの一直線回答（全問同じ値） → -15点
 *  4. 回答時間が短すぎる（設問数×2秒未満） → -30点
 *  5. 選択式設問5問以上で全問同じ位置の選択肢 → -15点
 *
 * B-1拡張（非LLMの意味近似。設計書 §4.2）:
 *  6. 情報量：定型句率が高い（「特になし/わからない/いいと思う」等が主成分） → -10点
 *  7. 設問キーワード被覆率：設問の内容語が回答に全く反映されず内容語も僅少 → -10点
 *  8. コピペ：設問文の丸写し（編集類似が高い） → -15点
 *  9. 近傍重複：自由記述どうしの使い回し（SimHashハミング距離が小） → -15点
 */
export class RuleBasedEvaluator implements IQualityEvaluator {
  async evaluate(items: EvaluationItem[], context?: EvaluationContext): Promise<QualityResult> {
    let score = 100;
    const reasons: string[] = [];

    // 1. アテンションチェック
    for (const item of items) {
      if (!item.correctOptionText) continue;
      const selectedTexts = (item.answer?.option_ids ?? []).map((id) =>
        item.question.options.find((o) => o.id === id)?.text ?? ''
      );
      const passed = selectedTexts.includes(item.correctOptionText);
      if (!passed) {
        return {
          score: 0,
          feedback:
            'アテンションチェック設問への回答が確認できませんでした。設問をよく読んでの回答にご協力ください。',
        };
      }
    }

    // 2. 短すぎるテキスト回答
    const textItems = items.filter(
      (i) => i.question.type === 'text' || i.question.type === 'paragraph'
    );
    const answeredTextItems = textItems.filter(
      (i) => (i.answer?.text_answer ?? '').trim().length > 0
    );
    const shortAnswers = answeredTextItems.filter(
      (i) => (i.answer?.text_answer ?? '').trim().length < 10
    );
    // 件数比例で減点（旧: 何問該当しても一律 -20）。短文が回答の過半なら追加減点。
    if (shortAnswers.length > 0) {
      score -= Math.min(40, 15 * shortAnswers.length);
      if (answeredTextItems.length > 0 && shortAnswers.length / answeredTextItems.length >= 0.5) {
        score -= 10;
      }
      reasons.push('自由記述の回答が短く、内容の充実度に改善の余地があります。');
    }

    // 3. スケール設問の一直線回答（全問同じ値）
    const scaleItems = items.filter((i) => i.question.type === 'scale');
    if (scaleItems.length >= 3) {
      const values = scaleItems.map((i) => (i.answer?.option_ids ?? [])[0] ?? '');
      const answered = values.filter((v) => v !== '');
      if (answered.length === scaleItems.length && new Set(answered).size === 1) {
        score -= 15;
        reasons.push('段階評価がすべて同じ値で、回答の一貫性に注意が必要です。');
      }
    }

    // 4. 回答時間が短すぎる（雑な「とりあえず埋めるだけ」検出）
    const durationSec = context?.durationSec;
    if (durationSec !== undefined && durationSec >= 0) {
      const minDuration = items.length * MIN_SECONDS_PER_QUESTION;
      if (durationSec < minDuration) {
        score -= TOO_FAST_PENALTY;
        reasons.push('回答時間が極端に短く、設問を十分に読まずに回答した可能性があります。');
      }
    }

    // 5. 選択式の直線回答：全問で同じ位置（order_index）の選択肢を選んでいる
    const positionItems = items.filter(
      (i) =>
        ['single', 'dropdown', 'scale', 'attention'].includes(i.question.type) &&
        (i.answer?.option_ids?.length ?? 0) === 1
    );
    if (positionItems.length >= STRAIGHT_LINE_MIN_QUESTIONS) {
      const positions = positionItems.map((i) => {
        const id = (i.answer?.option_ids ?? [])[0];
        return i.question.options.find((o) => o.id === id)?.order_index ?? -1;
      });
      if (positions.every((p) => p >= 0 && p === positions[0])) {
        score -= 15;
        reasons.push('選択式の回答がすべて同じ位置に並んでおり、機械的な回答の可能性があります。');
      }
    }

    // ── B-1拡張：自由記述の情報量・被覆率・コピペ/近傍重複（非LLM。設計書 §4.2）──
    // 既存の「短すぎる」ルール（<10字）が拾う極短文は対象外にし、二重減点を避ける。
    const contentTexts = textItems
      .map((i) => ({ item: i, text: (i.answer?.text_answer ?? '').trim() }))
      .filter((x) => x.text.length >= MIN_TEXT_LEN_FOR_CONTENT_RULES);

    // 6. 情報量（定型句率）— 該当件数に比例して減点
    const formulaicCount = contentTexts.filter(
      (x) => formulaicRatio(x.text) >= FORMULAIC_RATIO_THRESHOLD
    ).length;
    if (formulaicCount > 0) {
      score -= Math.min(30, FORMULAIC_PENALTY * formulaicCount);
      reasons.push('「特になし」等の定型的な記述が中心で、回答の情報量が乏しい可能性があります。');
    }

    // 7. 設問キーワード被覆率（off-topic 寄り：被覆ゼロ＋内容語も僅少）
    const offTopic = contentTexts.some((x) => {
      const cov = keywordCoverage(x.item.question.text, x.text);
      return cov !== null && cov <= LOW_COVERAGE_THRESHOLD && uniqueContentWords(x.text).size <= 1;
    });
    if (offTopic) {
      score -= OFF_TOPIC_PENALTY;
      reasons.push('設問のキーワードが回答に反映されておらず、主旨から外れている可能性があります。');
    }

    // 8. 設問文の丸写し（編集類似が高い＝コピペ）
    if (contentTexts.some((x) => editSimilarity(x.text, x.item.question.text) >= COPY_QUESTION_SIMILARITY)) {
      score -= COPY_QUESTION_PENALTY;
      reasons.push('設問文の丸写しに近い自由記述があります。');
    }

    // 9. 自由記述どうしの近傍重複（コピペの使い回し。簡易SimHash）
    //    使い回しに巻き込まれた設問数に比例して減点する（旧: 1組でも全件でも一律 -15）。
    const hashes = contentTexts.map((x) => simHash64(x.text));
    const dupSet = new Set<number>();
    for (let a = 0; a < hashes.length; a++) {
      for (let b = a + 1; b < hashes.length; b++) {
        if (hammingDistance(hashes[a], hashes[b]) <= NEAR_DUP_HAMMING_THRESHOLD) {
          dupSet.add(a);
          dupSet.add(b);
        }
      }
    }
    if (dupSet.size > 0) {
      // 使い回しは明確なゲーミング信号。巻き込まれた設問数に強く比例させる。
      // 2件 -18 / 3件 -35 / 4件以上 -48（上限）。
      score -= Math.min(48, 18 + (dupSet.size - 2) * 17);
      reasons.push('複数の自由記述がほぼ同じ内容で、使い回しの可能性があります。');
    }

    // 10. 一貫性ペアの矛盾チェック（consistency_anchor / consistency_check）
    const anchors = items.filter((i) => i.question.signal_meta?.role === 'consistency_anchor');
    for (const anchor of anchors) {
      const pairKey = anchor.question.signal_meta?.pairKey;
      if (!pairKey) continue;

      const check = items.find(
        (i) =>
          i.question.signal_meta?.role === 'consistency_check' &&
          i.question.signal_meta?.pairKey === pairKey,
      );
      if (!check) continue;

      const anchorAnswer = anchor.answer?.option_ids?.[0];
      const anchorOption = anchor.question.options.find((o) => o.id === anchorAnswer);
      const checkAnswer = check.answer?.option_ids?.[0];
      const checkOption = check.question.options.find((o) => o.id === checkAnswer);

      const positiveOptions = anchor.question.signal_meta?.positiveOptions ?? [];
      const contradictsWith = check.question.signal_meta?.contradictsWith ?? [];

      // trim() で前後の空白・改行の差異を吸収する
      const anchorIsPositive = positiveOptions.some(
        (p) => p.trim() === anchorOption?.text.trim(),
      );
      const checkIsContradicting = contradictsWith.some(
        (c) => c.trim() === checkOption?.text.trim(),
      );

      if (anchorIsPositive && checkIsContradicting) {
        score -= 20;
        reasons.push('回答に矛盾が検出されました。');
      }
    }

    score = Math.max(0, Math.min(100, score));
    const feedback =
      reasons.length === 0
        ? '丁寧に回答いただきありがとうございました。問題は見つかりませんでした。'
        : reasons.join(' ');
    return { score, feedback };
  }
}
