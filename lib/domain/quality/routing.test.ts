import { describe, expect, it } from 'vitest';
import { shouldCallLLM } from './routing';
import type { EvaluationItem, MechSignals } from './types';
import type { AnswerInput, QuestionType, QuestionWithOptions } from '@/lib/types/database';

function question(id: string, type: QuestionType): QuestionWithOptions {
  return {
    id,
    survey_id: 's',
    type,
    text: id,
    description: null,
    required: false,
    config: null,
    section_index: 0,
    order_index: 0,
    condition: null,
    options: [],
  };
}

function item(
  q: QuestionWithOptions,
  answer: AnswerInput | undefined
): EvaluationItem {
  return { question: q, answer };
}

/** 機械シグナルの組み立てヘルパ（PASS=満点を既定とする） */
function mech(partial: Partial<MechSignals> = {}): MechSignals {
  return { rulePass: true, ruleScore: 100, ...partial };
}

const choice = (id: string) => item(question(id, 'single'), { question_id: id, option_ids: [`${id}-o0`] });
const longText = (id: string, text: string) =>
  item(question(id, 'paragraph'), { question_id: id, text_answer: text });
const shortText = (id: string, text: string) =>
  item(question(id, 'text'), { question_id: id, text_answer: text });

describe('shouldCallLLM（ルーティング §3）', () => {
  it('自由記述0問（選択式のみ）はLLMを呼ばない', () => {
    const res = shouldCallLLM([choice('q1'), choice('q2')], mech());
    expect(res.callLLM).toBe(false);
  });

  it('全て短答可＆機械PASSならLLMを呼ばない', () => {
    const items = [choice('q1'), shortText('q2', 'はい、満足です')];
    const res = shouldCallLLM(items, mech({ rulePass: true, ruleScore: 100 }));
    expect(res.callLLM).toBe(false);
  });

  it('T0確定（ruleScore=0）はLLMを呼ばない', () => {
    const items = [longText('q1', 'たっぷり書かれた自由記述の回答です')];
    const res = shouldCallLLM(items, mech({ rulePass: false, ruleScore: 0 }));
    expect(res.callLLM).toBe(false);
  });

  it('自由記述あり＆グレー（PASSでない）ならLLMを呼ぶ', () => {
    const items = [longText('q1', 'それなりに書かれた自由記述')];
    const res = shouldCallLLM(items, mech({ rulePass: false, ruleScore: 80 }));
    expect(res.callLLM).toBe(true);
  });

  it('長文paragraphがあれば機械PASSでもLLMを呼ぶ', () => {
    const items = [longText('q1', '長文の自由記述。内容の妥当性はLLMで評価する。')];
    const res = shouldCallLLM(items, mech({ rulePass: true, ruleScore: 100 }));
    expect(res.callLLM).toBe(true);
  });

  it('hint.paste が立っていればLLMを呼ぶ', () => {
    const res = shouldCallLLM([choice('q1')], mech({ hints: { paste: true } }));
    expect(res.callLLM).toBe(true);
  });

  it('hint.aiStyle が立っていればLLMを呼ぶ', () => {
    const res = shouldCallLLM([shortText('q1', 'ok')], mech({ hints: { aiStyle: true } }));
    expect(res.callLLM).toBe(true);
  });

  it('hint.inputDynamics が立っていればLLMを呼ぶ', () => {
    const res = shouldCallLLM([choice('q1')], mech({ hints: { inputDynamics: true } }));
    expect(res.callLLM).toBe(true);
  });

  it('T0確定はヒントより優先（呼ばない）', () => {
    const res = shouldCallLLM(
      [longText('q1', 'x')],
      mech({ rulePass: false, ruleScore: 0, hints: { paste: true } })
    );
    expect(res.callLLM).toBe(false);
  });

  it('判定理由（reason）が必ず付く', () => {
    const res = shouldCallLLM([choice('q1')], mech());
    expect(res.reason.length).toBeGreaterThan(0);
  });
});
