import { describe, expect, it } from 'vitest';
import {
  buildReferenceVectors,
  scoreRelevance,
  type SurveyReferenceVectors,
} from './referenceVector';
import { l2normalize, type ILocalEncoder } from './embedding/encoder';

/**
 * 決定論的なダミーエンコーダ（埋め込みはテストで固定）。
 * テキスト→ベクトルの対応表を渡し、未知テキストはゼロベクトル。
 */
class DummyEncoder implements ILocalEncoder {
  readonly id: string;
  readonly dim = 3;
  constructor(
    private readonly table: Record<string, number[]>,
    id = 'dummy-v1'
  ) {
    this.id = id;
  }
  async embed(text: string): Promise<number[]> {
    return l2normalize(this.table[text] ?? [0, 0, 0]);
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

const TABLE: Record<string, number[]> = {
  '好きな食べ物は何ですか': [1, 0, 0],
  '寿司が好きです': [0.9, 0.1, 0], // 設問に近い領域（関連）
  'ラーメンが好物です': [0.8, 0.2, 0], // 別アンカー（領域化）
  '今日は晴れだ': [0, 0, 1], // off-topic
};

async function makeRefs(encoder: ILocalEncoder): Promise<SurveyReferenceVectors> {
  return buildReferenceVectors(encoder, [
    {
      questionOrder: 0,
      questionText: '好きな食べ物は何ですか',
      idealAnswers: ['寿司が好きです', 'ラーメンが好物です'],
    },
  ]);
}

describe('referenceVector（§13.2 参照ベクトル方式）', () => {
  it('補正2: 参照と回答が同一エンコーダなら関連性を返す', async () => {
    const enc = new DummyEncoder(TABLE);
    const refs = await makeRefs(enc);
    const emb = await enc.embed('寿司が好きです');
    const r = scoreRelevance(enc, emb, '寿司が好きです', refs, 0);
    expect(r.indeterminate).toBe(false);
    expect(r.onTopic).toBe(true);
    expect(r.relevance).toBeGreaterThan(0.8);
  });

  it('補正3: 領域化＝複数アンカーのどれかに近ければ関連とみなす', async () => {
    const enc = new DummyEncoder(TABLE);
    const refs = await makeRefs(enc);
    const emb = await enc.embed('ラーメンが好物です');
    const r = scoreRelevance(enc, emb, 'ラーメンが好物です', refs, 0);
    expect(r.onTopic).toBe(true);
    expect(r.relevance).toBeGreaterThan(0.8);
  });

  it('off-topic な回答は関連性が低く onTopic=false', async () => {
    const enc = new DummyEncoder(TABLE);
    const refs = await makeRefs(enc);
    const emb = await enc.embed('今日は晴れだ');
    const r = scoreRelevance(enc, emb, '今日は晴れだ', refs, 0);
    expect(r.onTopic).toBe(false);
    expect(r.relevance).toBeLessThan(0.25);
  });

  it('補正2: 別エンコーダ（空間不一致）なら判定を放棄（安全側＝indeterminate）', async () => {
    const enc = new DummyEncoder(TABLE);
    const refs = await makeRefs(enc);
    const other = new DummyEncoder(TABLE, 'other-encoder-v9');
    const emb = await other.embed('寿司が好きです');
    const r = scoreRelevance(other, emb, '寿司が好きです', refs, 0);
    expect(r.indeterminate).toBe(true);
    expect(r.onTopic).toBe(true); // 判定不能時は減点しない
  });

  it('参照が無い場合は indeterminate（減点しない）', async () => {
    const enc = new DummyEncoder(TABLE);
    const emb = await enc.embed('寿司が好きです');
    const r = scoreRelevance(enc, emb, '寿司が好きです', null, 0);
    expect(r.indeterminate).toBe(true);
  });

  it('補正3: 設問文の丸写し（高類似）は likelyCopy フラグが立つ（破棄はしない）', async () => {
    const enc = new DummyEncoder({
      '好きな食べ物は何ですか': [1, 0, 0],
      寿司: [0, 1, 0],
    });
    const refs = await buildReferenceVectors(enc, [
      { questionOrder: 0, questionText: '好きな食べ物は何ですか', idealAnswers: ['寿司'] },
    ]);
    // 設問文そのものを回答として投入（ベクトルが questionVector と一致＝丸写し）
    const emb = await enc.embed('好きな食べ物は何ですか');
    const r = scoreRelevance(enc, emb, '好きな食べ物は何ですか', refs, 0);
    expect(r.likelyCopy).toBe(true);
  });

  it('生成された参照にエンコーダIDと次元が刻まれる（補正2の担保）', async () => {
    const enc = new DummyEncoder(TABLE);
    const refs = await makeRefs(enc);
    expect(refs.encoderId).toBe('dummy-v1');
    expect(refs.dim).toBe(3);
    expect(refs.questions[0].anchors.length).toBe(2);
  });
});
