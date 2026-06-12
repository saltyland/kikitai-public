'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { submitResponseAction, submitSharedLinkResponseAction } from '@/app/actions/response';
import { submitGuestResponseAction } from '@/app/actions/guest';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import { computeVisibleQuestionIds } from '@/lib/domain/questions/visibility';
import type {
  AnswerInput,
  GridConfig,
  QuestionWithOptions,
  ScaleConfig,
  SurveyWithQuestions,
} from '@/lib/types/database';

/** question_id -> 回答状態 */
type QState = { optionIds: string[]; text: string; grid: Record<string, string[]> };
type AnswerState = Record<string, QState>;

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1';

/** 1設問分の状態を AnswerInput に変換する */
function buildAnswer(q: QuestionWithOptions, s: QState): AnswerInput {
  if (q.type === 'text' || q.type === 'paragraph' || q.type === 'date') {
    return { question_id: q.id, text_answer: s.text };
  }
  if (q.type === 'grid') {
    const grid_answers = Object.entries(s.grid)
      .filter(([, cols]) => cols.length > 0)
      .map(([row, columns]) => ({ row, columns }));
    return { question_id: q.id, grid_answers };
  }
  return { question_id: q.id, option_ids: s.optionIds };
}

/** 1設問あたりの推定回答秒数（所要時間の目安に使う） */
const SECONDS_PER_TYPE: Record<string, number> = {
  single: 8,
  multiple: 12,
  dropdown: 8,
  attention: 8,
  scale: 8,
  grid: 20,
  text: 25,
  paragraph: 60,
  date: 10,
};

function draftKey(surveyId: string) {
  return `kikitai-draft-${surveyId}`;
}
function pendingKey(surveyId: string) {
  return `kikitai-pending-${surveyId}`;
}

/** 確認画面表示用：1設問の回答を人が読める文字列にする */
function answerSummary(q: QuestionWithOptions, s: QState): string {
  if (q.type === 'text' || q.type === 'paragraph' || q.type === 'date') {
    return s.text.trim();
  }
  if (q.type === 'grid') {
    const parts = Object.entries(s.grid)
      .filter(([, cols]) => cols.length > 0)
      .map(([row, cols]) => `${row}：${cols.join('・')}`);
    return parts.join(' / ');
  }
  const textById = new Map(q.options.map((o) => [o.id, o.text]));
  return s.optionIds.map((id) => textById.get(id) ?? '').filter(Boolean).join('・');
}

export default function AnswerForm({
  survey,
  guestToken,
  shareToken,
}: {
  survey: SurveyWithQuestions;
  /** 共有リンク（ゲスト回答）のトークン。指定時はゲスト用アクションで送信する。 */
  guestToken?: string;
  /** 共有リンク（ログイン済み回答）のトークン。指定時は共有リンク用アクションで送信する。 */
  shareToken?: string;
}) {
  const [consented, setConsented] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>(() => {
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '', grid: {} }));
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  // 追加状態
  const [reviewing, setReviewing] = useState(false); // 送信前の確認・修正画面
  // 低品質判定で保存前に差し戻された際のフィードバック（見直し or 受け入れ送信を選ぶ）
  const [rejectedFeedback, setRejectedFeedback] = useState<string | null>(null);
  // 回答開始時刻（同意した瞬間から計測。所要時間は不正回答検出の参考値として送る）
  const startedAt = useRef<number | null>(null);
  const [showCheck, setShowCheck] = useState(false); // 「次へ」進行時の✓アニメ
  const [saving, setSaving] = useState(false); // 自動保存インジケーターの点滅
  const [online, setOnline] = useState(true); // オンライン状態
  const [queued, setQueued] = useState(false); // 未送信（オフライン保留）の有無

  // スワイプ移動用のタッチ座標
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // ---- 途中保存：マウント時に下書き（localStorage）を復元 ----
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(survey.id));
      if (raw) {
        const data = JSON.parse(raw) as { answers?: AnswerState; step?: number };
        if (data.answers) {
          setAnswers((prev) => {
            const merged = { ...prev };
            for (const id of Object.keys(merged)) {
              if (data.answers![id]) merged[id] = data.answers![id];
            }
            return merged;
          });
          setStep(data.step ?? 0);
          // 同意状態はドラフトから復元しない：倫理要件として毎セッション明示同意を取る
          setRestored(true);
        }
      }
      if (localStorage.getItem(pendingKey(survey.id))) setQueued(true);
    } catch {
      /* 壊れた下書きは無視 */
    }
    setLoaded(true);
  }, [survey.id]);

  // ---- 途中保存：回答・進捗の変化を自動保存（保存時に保存インジケーターを点滅） ----
  useEffect(() => {
    if (!loaded) return;
    try {
      // 同意状態は意図的に保存しない（毎セッション明示同意を取るため）
      localStorage.setItem(draftKey(survey.id), JSON.stringify({ answers, step }));
      setSaving(true);
      const t = setTimeout(() => setSaving(false), 800);
      return () => clearTimeout(t);
    } catch {
      /* 保存失敗は無視 */
    }
  }, [answers, step, loaded, survey.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey(survey.id));
    } catch {
      /* 無視 */
    }
  };

  // 条件付き表示：現在の回答に応じて「実際に表示される設問」を順番に並べる
  const visibleQuestions = useMemo(() => {
    const optionTextById = new Map<string, string>();
    survey.questions.forEach((q) => q.options.forEach((o) => optionTextById.set(o.id, o.text)));
    const selectedTexts = (qid: string) =>
      (answers[qid]?.optionIds ?? []).map((id) => optionTextById.get(id) ?? '');
    const visibleIds = computeVisibleQuestionIds(survey.questions, selectedTexts);
    return [...survey.questions]
      .sort((a, b) => a.section_index - b.section_index || a.order_index - b.order_index)
      .filter((q) => visibleIds.has(q.id));
  }, [survey.questions, answers]);

  const total = visibleQuestions.length;
  const safeStep = Math.min(step, Math.max(0, total - 1));
  const current = visibleQuestions[safeStep];

  const remainingSeconds = visibleQuestions
    .slice(safeStep)
    .reduce((s, q) => s + (SECONDS_PER_TYPE[q.type] ?? 15), 0);
  const remainingMin = Math.max(1, Math.round(remainingSeconds / 60));

  // ---- 状態更新 ----
  const setSingle = (qid: string, optionId: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], optionIds: [optionId] } }));
  const toggleMultiple = (qid: string, optionId: string) =>
    setAnswers((a) => {
      const cur = a[qid].optionIds;
      const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
      return { ...a, [qid]: { ...a[qid], optionIds: next } };
    });
  const setText = (qid: string, text: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], text } }));
  const setGridCell = (qid: string, row: string, col: string, multiple: boolean) =>
    setAnswers((a) => {
      const cur = a[qid].grid[row] ?? [];
      let next: string[];
      if (multiple) {
        next = cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col];
      } else {
        next = [col];
      }
      return { ...a, [qid]: { ...a[qid], grid: { ...a[qid].grid, [row]: next } } };
    });

  // ---- 現在の設問のみバリデーション ----
  const validateCurrent = (): boolean => {
    if (!current) return true;
    try {
      QuestionTypeRegistry.get(current.type).validateAnswer(buildAnswer(current, answers[current.id]), current);
    } catch (e) {
      setError(e instanceof Error ? e.message : '入力内容を確認してください');
      return false;
    }
    setError(null);
    return true;
  };

  // ✓アニメを一瞬出す
  const popCheck = () => {
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 700);
  };

  const goNext = () => {
    if (!validateCurrent()) return;
    popCheck();
    setStep(Math.min(total - 1, safeStep + 1));
  };
  const goPrev = () => {
    setError(null);
    setStep(Math.max(0, safeStep - 1));
  };

  /**
   * 全表示設問の一括バリデーション（B#15）。
   * 分岐で後から現れた設問やドットナビでジャンプした経路の未充足を、
   * 確認画面へ進む前・送信前に検出し、最初の未充足設問へ誘導する。
   * 戻り値：すべて充足なら null、未充足があればその設問の index。
   */
  const findFirstInvalid = (): { index: number; message: string } | null => {
    for (let i = 0; i < visibleQuestions.length; i++) {
      const q = visibleQuestions[i];
      try {
        QuestionTypeRegistry.get(q.type).validateAnswer(buildAnswer(q, answers[q.id]), q);
      } catch (e) {
        return { index: i, message: e instanceof Error ? e.message : '入力内容を確認してください' };
      }
    }
    return null;
  };

  // 最後の設問から確認画面へ（全設問を一括検証してから）
  const goReview = () => {
    if (!validateCurrent()) return;
    const invalid = findFirstInvalid();
    if (invalid) {
      setStep(invalid.index);
      setError(invalid.message);
      return;
    }
    popCheck();
    setReviewing(true);
  };
  // 確認画面から該当設問へジャンプして修正
  const editQuestion = (index: number) => {
    setReviewing(false);
    setStep(index);
    setError(null);
  };

  const restart = () => {
    clearDraft();
    const init: AnswerState = {};
    survey.questions.forEach((q) => (init[q.id] = { optionIds: [], text: '', grid: {} }));
    setAnswers(init);
    setStep(0);
    setReviewing(false);
    setRestored(false);
    setError(null);
  };

  // ---- 送信（オフライン時はキューに保存して再送） ----
  const queuePayload = (payload: AnswerInput[]) => {
    try {
      localStorage.setItem(pendingKey(survey.id), JSON.stringify(payload));
    } catch {
      /* 無視 */
    }
    setQueued(true);
    // Background Sync を登録（対応ブラウザのみ）
    navigator.serviceWorker?.ready
      .then((reg) => (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync?.register('kikitai-submit'))
      .catch(() => {});
  };

  const sendPayload = async (
    payload: AnswerInput[],
    acceptLowQuality = false
  ): Promise<boolean> => {
    const formData = new FormData();
    formData.set('payload', JSON.stringify(payload));
    // 回答所要時間（秒）。不正回答検出（極端な短時間）の参考値。
    if (startedAt.current) {
      formData.set('durationSec', String(Math.round((Date.now() - startedAt.current) / 1000)));
    }
    if (acceptLowQuality) formData.set('acceptLowQuality', '1');
    try {
      // 送信先アクションを props に応じて切り替える
      let result;
      if (guestToken) {
        // 未ログインゲスト回答（ポイント付与なし）
        formData.set('shareToken', guestToken);
        result = await submitGuestResponseAction({ error: null }, formData);
      } else if (shareToken) {
        // ログイン済み共有リンク回答（share_link_no_reward に応じてポイント付与）
        formData.set('shareToken', shareToken);
        result = await submitSharedLinkResponseAction({ error: null }, formData);
      } else {
        formData.set('surveyId', survey.id);
        result = await submitResponseAction({ error: null }, formData);
      }
      if (result?.error) {
        setError(result.error);
        return false;
      }
      // 低品質判定の差し戻し：保存されていないので、見直すか受け入れて再送するか選ばせる
      if (result && 'rejectedFeedback' in result && result.rejectedFeedback) {
        setRejectedFeedback(result.rejectedFeedback);
        return false;
      }
      // 成功（通常はサーバー側 redirect で遷移）
      clearDraft();
      try {
        localStorage.removeItem(pendingKey(survey.id));
      } catch {
        /* 無視 */
      }
      setQueued(false);
      return true;
    } catch (e) {
      // Next の redirect はそのまま伝播させる（成功扱い）
      if (e && typeof e === 'object' && 'digest' in e && String((e as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
        throw e;
      }
      // ネットワーク失敗 → キューに退避
      queuePayload(payload);
      return false;
    }
  };

  const submit = async (acceptLowQuality = false) => {
    // 送信直前にも全設問を一括検証する（確認画面に滞在中の状態変化への備え）
    const invalid = findFirstInvalid();
    if (invalid) {
      setReviewing(false);
      setStep(invalid.index);
      setError(invalid.message);
      return;
    }
    const payload: AnswerInput[] = visibleQuestions.map((q) => buildAnswer(q, answers[q.id]));
    if (!navigator.onLine) {
      queuePayload(payload);
      return;
    }
    setPending(true);
    await sendPayload(payload, acceptLowQuality);
    setPending(false);
  };

  // 低品質差し戻しから「内容を見直す」：設問の先頭に戻る
  const reviseAnswers = () => {
    setRejectedFeedback(null);
    setReviewing(false);
    setStep(0);
    setError(null);
  };

  // 保留中の回答を再送する
  const retryPending = async () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(pendingKey(survey.id));
    } catch {
      /* 無視 */
    }
    if (!raw) return;
    if (!navigator.onLine) return;
    let payload: AnswerInput[];
    try {
      payload = JSON.parse(raw) as AnswerInput[];
    } catch {
      return;
    }
    setPending(true);
    await sendPayload(payload);
    setPending(false);
  };

  // ---- オフライン対応：Service Worker 登録・オンライン復帰の監視 ----
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOnline(navigator.onLine);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const goOnline = () => {
      setOnline(true);
      void retryPending();
    };
    const goOffline = () => setOnline(false);
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'kikitai-retry-submit') void retryPending();
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
    // マウント時に1回登録すれば十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // インフォームドコンセント同意画面
  if (!consented) {
    const estMin = Math.max(
      1,
      Math.round(survey.questions.reduce((s, q) => s + (SECONDS_PER_TYPE[q.type] ?? 15), 0) / 60)
    );
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-zinc-800">回答にあたってのご説明</h2>
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          全{survey.questions.length}問・所要時間 約{estMin}分
        </p>
        {/* 作成者が設定したインフォームドコンセント文（8位）。同意した人だけ設問へ進める */}
        {survey.consent_text ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
            {survey.consent_text}
          </div>
        ) : (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>本アンケートは学術目的で実施されます。</p>
            <p>・回答は任意であり、いつでも中断できます（入力内容は自動保存されます）。</p>
            <p>・回答内容はアンケート作成者が研究目的で集計・利用します。</p>
            <p>・個人を特定する情報は収集しません。</p>
          </div>
        )}
        <p className="text-sm text-zinc-600">上記に同意のうえ、回答を開始してください。</p>
        {restored && (
          <p className="text-sm text-amber-700">前回の入力内容が残っています。続きから再開できます。</p>
        )}
        <button
          onClick={() => {
            startedAt.current = Date.now();
            setConsented(true);
          }}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
        >
          同意して回答を始める
        </button>
      </div>
    );
  }

  // ===== 送信前の確認・修正画面 =====
  if (reviewing) {
    return (
      <div className="space-y-4">
        {/* 低品質判定の差し戻し（保存前）：見直すか、0pt＋信頼スコア減点を受け入れて送信するか */}
        {rejectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-3">
              <h2 className="text-base font-bold text-amber-700">回答内容の見直しをおすすめします</h2>
              <p className="text-sm text-zinc-600">
                AIによる品質チェックで、回答の充実度に課題がある可能性が示されました。
                まだ送信されていません。内容を見直すと報酬ポイントを受け取れます。
              </p>
              <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                {rejectedFeedback}
              </p>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setRejectedFeedback(null);
                    void submit(true);
                  }}
                  disabled={pending}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                >
                  このまま送信する（報酬なし・信頼スコア減点）
                </button>
                <button
                  onClick={reviseAnswers}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
                >
                  回答を見直す
                </button>
              </div>
            </div>
          </div>
        )}
        <OfflineBanner online={online} queued={queued} pending={pending} onRetry={retryPending} />
        <div className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-zinc-800">回答内容の確認</h2>
          <p className="text-sm text-zinc-500">
            送信前に内容をご確認ください。修正したい設問は「修正」を押すと戻れます。
          </p>
          <ul className="divide-y divide-zinc-100">
            {visibleQuestions.map((q, i) => {
              const summary = answerSummary(q, answers[q.id]);
              const empty = !summary;
              return (
                <li key={q.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800">
                      {q.text}
                      {q.required && (
                        <>
                          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
                          <span className="sr-only">（必須）</span>
                        </>
                      )}
                    </p>
                    <p className={`mt-0.5 text-sm ${empty ? 'text-zinc-400 italic' : 'text-zinc-600'} whitespace-pre-wrap break-words`}>
                      {empty ? '（未回答）' : summary}
                    </p>
                  </div>
                  <button
                    onClick={() => editQuestion(i)}
                    className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                  >
                    修正
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReviewing(false)}
            className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 cursor-pointer"
          >
            設問に戻る
          </button>
          <button
            onClick={() => submit()}
            disabled={pending}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {pending ? '送信中…' : queued ? '再送信する' : '回答を送信する'}
          </button>
        </div>
      </div>
    );
  }

  // 現在の設問が属するセクションの見出し
  const section = current ? survey.sections[Math.min(current.section_index, survey.sections.length - 1)] : null;
  const isSectionStart =
    current && (safeStep === 0 || visibleQuestions[safeStep - 1].section_index !== current.section_index);

  // スワイプ判定（横移動が縦より大きく一定距離を超えたら前後移動）
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      if (safeStep < total - 1) goNext();
      else goReview();
    } else {
      goPrev();
    }
  };

  return (
    <div className="space-y-4">
      <OfflineBanner online={online} queued={queued} pending={pending} onRetry={retryPending} />

      {/* 進捗インジケーター */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-600">
          <span>問 {safeStep + 1} / {total}</span>
          <span>残り約{remainingMin}分</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={safeStep + 1}
          aria-valuetext={`全${total}問中${safeStep + 1}問目`}
          className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${total > 0 ? ((safeStep + 1) / total) * 100 : 0}%` }}
          />
        </div>
        {total <= 30 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {visibleQuestions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                aria-label={`設問${i + 1}へ`}
                onClick={() => i <= safeStep && setStep(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i < safeStep
                    ? 'bg-indigo-500 cursor-pointer'
                    : i === safeStep
                    ? 'bg-indigo-600 ring-2 ring-indigo-200'
                    : 'bg-zinc-200 cursor-default'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {restored && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <span>前回の続きから再開しました。</span>
          <button onClick={restart} className="font-medium underline hover:text-amber-900 cursor-pointer">
            最初からやり直す
          </button>
        </div>
      )}

      {isSectionStart && section && (section.title || section.description) && (
        <section className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
          {section.title && <h2 className="font-bold text-indigo-800">{section.title}</h2>}
          {section.description && (
            <p className="mt-1 text-sm text-indigo-700 whitespace-pre-wrap">{section.description}</p>
          )}
        </section>
      )}

      {current && (
        <section
          key={current.id}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="kikitai-slide-in relative rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3"
        >
          {/* ✓ マイクロフィードバック */}
          {showCheck && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="kikitai-check-pop text-6xl text-emerald-500">✓</span>
            </div>
          )}
          <p className="font-medium text-zinc-800">
            <span className="text-indigo-600 mr-1">Q{safeStep + 1}.</span>
            {current.text}
            {current.required && (
              <>
                <span aria-hidden="true" className="text-red-500 ml-1">*</span>
                <span className="sr-only">（必須）</span>
              </>
            )}
          </p>
          {current.description && (
            <p className="text-xs text-zinc-500 whitespace-pre-wrap">{current.description}</p>
          )}
          <QuestionInputView
            q={current}
            state={answers[current.id]}
            setSingle={setSingle}
            toggleMultiple={toggleMultiple}
            setText={setText}
            setGridCell={setGridCell}
          />
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ナビゲーションバー：スマホでは画面下部に固定、PCではインライン */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {safeStep > 0 && (
            <button
              onClick={goPrev}
              className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 cursor-pointer"
            >
              戻る
            </button>
          )}
          {safeStep < total - 1 ? (
            <button
              onClick={goNext}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={goReview}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
            >
              回答内容を確認する
            </button>
          )}
          <span
            className={`ml-auto text-xs ${saving ? 'kikitai-saving text-indigo-500' : 'text-zinc-400'}`}
          >
            {saving ? '✓ 保存しました' : '✓ 入力は自動保存されます'}
          </span>
        </div>
      </div>
      {/* スマホ固定バーの高さ分だけ余白を確保 */}
      <div className="h-16 sm:hidden" aria-hidden />
      <p className="text-center text-[11px] text-zinc-300 sm:hidden">← スワイプで前後に移動できます →</p>
    </div>
  );
}

/** オフライン／未送信の通知バナー */
function OfflineBanner({
  online,
  queued,
  pending,
  onRetry,
}: {
  online: boolean;
  queued: boolean;
  pending: boolean;
  onRetry: () => void;
}) {
  if (online && !queued) return null;
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
        online ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-zinc-300 bg-zinc-100 text-zinc-700'
      }`}
    >
      <span>
        {!online
          ? 'オフラインです。入力内容は保存され、オンライン復帰時に自動送信されます。'
          : queued
          ? '未送信の回答があります。オンラインに復帰しました。'
          : ''}
      </span>
      {queued && online && (
        <button
          onClick={onRetry}
          disabled={pending}
          className="ml-2 shrink-0 rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
        >
          {pending ? '送信中…' : '今すぐ再送信'}
        </button>
      )}
    </div>
  );
}

/** 設問タイプ別の入力UI（スマホ最適化：行全体をタップ可能に） */
function QuestionInputView({
  q,
  state,
  setSingle,
  toggleMultiple,
  setText,
  setGridCell,
}: {
  q: QuestionWithOptions;
  state: QState;
  setSingle: (qid: string, optionId: string) => void;
  toggleMultiple: (qid: string, optionId: string) => void;
  setText: (qid: string, text: string) => void;
  setGridCell: (qid: string, row: string, col: string, multiple: boolean) => void;
}) {
  if (q.type === 'single' || q.type === 'multiple' || q.type === 'attention') {
    const multiple = q.type === 'multiple';
    return (
      <div className="space-y-2">
        {q.options.map((o) => {
          const checked = multiple ? state.optionIds.includes(o.id) : state.optionIds[0] === o.id;
          return (
            <label
              key={o.id}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm cursor-pointer transition ${
                checked
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={q.id}
                className="h-4 w-4 shrink-0"
                checked={checked}
                onChange={() => (multiple ? toggleMultiple(q.id, o.id) : setSingle(q.id, o.id))}
              />
              <span className="flex-1">{o.text}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (q.type === 'dropdown') {
    return (
      <select
        className={inputClass}
        value={state.optionIds[0] ?? ''}
        onChange={(e) => setSingle(q.id, e.target.value)}
      >
        <option value="">選択してください</option>
        {q.options.map((o) => (
          <option key={o.id} value={o.id}>{o.text}</option>
        ))}
      </select>
    );
  }

  if (q.type === 'scale') {
    const cfg = (q.config ?? {}) as ScaleConfig;
    // 両端ラベルは選択肢の行に混ぜず上に独立配置し、各段階は数字+○のシンプル表示にする。
    return (
      <div className="flex flex-col gap-1">
        {(cfg.minLabel || cfg.maxLabel) && (
          <div className="flex justify-between text-xs text-zinc-500 px-1">
            <span>{cfg.minLabel ?? ''}</span>
            <span>{cfg.maxLabel ?? ''}</span>
          </div>
        )}
        <div className="flex items-end justify-around gap-1">
          {q.options.map((o) => {
            const checked = state.optionIds[0] === o.id;
            return (
              <label
                key={o.id}
                className="flex flex-col items-center gap-1 cursor-pointer select-none"
              >
                <span className={`text-sm font-medium transition ${checked ? 'text-indigo-600' : 'text-zinc-600'}`}>
                  {o.text}
                </span>
                <span
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                    checked ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-400 bg-white hover:border-indigo-400'
                  }`}
                >
                  {checked && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                </span>
                <input
                  type="radio"
                  name={q.id}
                  className="sr-only"
                  checked={checked}
                  onChange={() => setSingle(q.id, o.id)}
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === 'text') {
    return <input className={inputClass} value={state.text} onChange={(e) => setText(q.id, e.target.value)} />;
  }

  if (q.type === 'paragraph') {
    return <textarea rows={4} className={inputClass} value={state.text} onChange={(e) => setText(q.id, e.target.value)} />;
  }

  if (q.type === 'date') {
    return <input type="date" className={inputClass} value={state.text} onChange={(e) => setText(q.id, e.target.value)} />;
  }

  if (q.type === 'grid') {
    const cfg = (q.config ?? { rows: [], columns: [], multiple: false }) as GridConfig;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2"></th>
              {cfg.columns.map((c) => (
                <th key={c} className="p-2 text-center text-xs font-medium text-zinc-600">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cfg.rows.map((r) => (
              <tr key={r} className="border-t border-zinc-100">
                <td className="p-2 text-zinc-700">{r}</td>
                {cfg.columns.map((c) => (
                  <td key={c} className="p-2 text-center">
                    <input
                      type={cfg.multiple ? 'checkbox' : 'radio'}
                      name={`${q.id}__${r}`}
                      className="h-4 w-4"
                      checked={(state.grid[r] ?? []).includes(c)}
                      onChange={() => setGridCell(q.id, r, c, cfg.multiple)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}
