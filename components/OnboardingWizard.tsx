'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeOnboardingAction,
  saveTopicSelectionAction,
  type OnboardingActionState,
} from '@/app/actions/onboarding';
import { inputClass } from '@/lib/ui/styles';
import { Spinner } from '@/components/ui/Spinner';
import OnboardingIntro from '@/components/OnboardingIntro';
import type { Topic } from '@/lib/types/database';

const initial: OnboardingActionState = { error: null };

/** 紹介の後のフォーム工程数（プロフィール→トピック→完了） */
const FORM_STEPS = 3;

const GENDERS = ['男性', '女性', 'ノンバイナリー', '回答しない'];
const OCCUPATIONS = ['中学生', '高校生', '学部生', '大学院生（修士）', '大学院生（博士）', '研究者・教員', '社会人', 'その他'];
/** 職業ごとの学年の選択肢。ここに無い職業（研究者・教員、社会人、その他）は学年を聞かない */
const GRADE_OPTIONS: Record<string, string[]> = {
  '中学生': ['1年', '2年', '3年'],
  '高校生': ['1年', '2年', '3年'],
  '学部生': ['1年', '2年', '3年', '4年'],
  '大学院生（修士）': ['M1', 'M2'],
  '大学院生（博士）': ['D1', 'D2', 'D3以上'],
};

interface Props {
  nickname: string;
  topics: Topic[];
}

export default function OnboardingWizard({ nickname, topics }: Props) {
  // 'intro'＝ゲームフリーク風のスクロール紹介、'form'＝プロフィール登録以降
  const [phase, setPhase] = useState<'intro' | 'form'>('intro');
  // フォーム工程は 4(プロフィール)→5(トピック)→6(完了)
  const [step, setStep] = useState(4);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // step4のフォーム値
  const [form, setForm] = useState({
    nickname: nickname,
    birthday: '',
    gender: '',
    occupation: '',
    grade: '',
    affiliation: '',
    field: '',
    major: '',
  });
  const [privateFields, setPrivateFields] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // step5（トピック選択）
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isTopicPending, startTopicTransition] = useTransition();
  const [topicError, setTopicError] = useState<string | null>(null);

  const togglePrivate = (field: string) => {
    setPrivateFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleTopicSubmit = (topicIds: string[]) => {
    setTopicError(null);
    startTopicTransition(async () => {
      const result = await saveTopicSelectionAction(topicIds);
      if (result.error) {
        setTopicError(result.error);
      } else {
        setStep(6);
      }
    });
  };

  const handleSubmitProfile = () => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      privateFields.forEach((f) => fd.append('private_fields', f));
      const result = await completeOnboardingAction(initial, fd);
      if (result.error) {
        setServerError(result.error);
      } else {
        setStep(5);
      }
    });
  };

  const gradeOptions = GRADE_OPTIONS[form.occupation] ?? null;
  const isProfileComplete =
    !!form.nickname.trim() &&
    !!form.birthday &&
    !!form.gender &&
    !!form.occupation &&
    (!gradeOptions || !!form.grade) &&
    !!form.affiliation.trim() &&
    !!form.field.trim();

  // 紹介（ストーリーテリング）パート：読み終えたらプロフィール登録へ
  if (phase === 'intro') {
    return (
      <OnboardingIntro
        nickname={nickname}
        onStart={() => {
          setPhase('form');
          setStep(4);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />
    );
  }

  // フォーム工程の進捗（4→1, 5→2, 6→3 of 3）
  const formIndex = step - 3;
  const progress = Math.round((formIndex / FORM_STEPS) * 100);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* 進捗バー */}
      <div className="mb-8 w-full max-w-lg">
        <div className="h-1.5 w-full rounded-full bg-brand-100">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-400">{formIndex} / {FORM_STEPS}</p>
      </div>

      <div className="card-3d w-full max-w-lg p-8 animate-[fade-in-up_0.4s_ease-out]">

        {/* ---- STEP 4: プロフィールアンケート ---- */}
        {step === 4 && (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-0.5 text-xs font-bold text-brand-600">あなたについてのアンケート</span>
              <span className="text-xs text-slate-400">全7問</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">あなたのことを教えてください</h2>
            <p className="mt-1 text-xs text-slate-500">各項目は「非公開」にすることができます（非公開にしてもポイントは付与されます）。</p>

            <div className="mt-5 space-y-5">
              {/* Q1 ニックネーム */}
              <QuestionBlock
                number={1}
                label="ニックネーム"
                required
                hint="他のユーザーに表示されます"
              >
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className={inputClass}
                  placeholder="例：田中太郎"
                />
              </QuestionBlock>

              {/* Q2 生年月日 */}
              <QuestionBlock
                number={2}
                label="生年月日"
                required
                fieldKey="age"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  className={inputClass}
                  max={new Date().toISOString().slice(0, 10)}
                  min="1900-01-01"
                />
              </QuestionBlock>

              {/* Q3 性別 */}
              <QuestionBlock
                number={3}
                label="性別"
                required
                fieldKey="gender"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: form.gender === g ? '' : g })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        form.gender === g
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q4 職業 */}
              <QuestionBlock
                number={4}
                label="職業・立場"
                required
                fieldKey="occupation"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <div className="flex flex-wrap gap-2">
                  {OCCUPATIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setForm({ ...form, occupation: form.occupation === o ? '' : o, grade: '' })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        form.occupation === o
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q5 学年（職業に応じた学年の選択肢を表示） */}
              {gradeOptions && (
                <QuestionBlock
                  number={5}
                  label={`学年（${form.occupation}）`}
                  required
                  fieldKey="grade"
                  privateFields={privateFields}
                  onTogglePrivate={togglePrivate}
                >
                  <div className="flex flex-wrap gap-2">
                    {gradeOptions.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, grade: form.grade === g ? '' : g })}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                          form.grade === g
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </QuestionBlock>
              )}

              {/* Q6 所属機関 */}
              <QuestionBlock
                number={gradeOptions ? 6 : 5}
                label="所属機関・大学名"
                required
                fieldKey="affiliation"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <input
                  type="text"
                  value={form.affiliation}
                  onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                  className={inputClass}
                  placeholder="例：早稲田大学"
                />
              </QuestionBlock>

              {/* Q7 研究分野・専攻 */}
              <QuestionBlock
                number={gradeOptions ? 7 : 6}
                label="研究分野・専攻"
                required
                fieldKey="field"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <input
                  type="text"
                  value={form.field}
                  onChange={(e) => setForm({ ...form, field: e.target.value })}
                  className={inputClass}
                  placeholder="例：情報科学、社会学、経営学"
                />
              </QuestionBlock>
            </div>

            {serverError && (
              <p role="alert" className="mt-4 text-sm text-red-600">{serverError}</p>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setPhase('intro')}
                disabled={isPending}
                className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
              >
                ← 紹介に戻る
              </button>
              <button
                onClick={handleSubmitProfile}
                disabled={isPending || !isProfileComplete}
                className="btn-3d btn-3d-primary flex-1 flex items-center justify-center gap-2 py-3 font-bold"
              >
                {isPending && <Spinner className="h-4 w-4" />}
                {isPending ? '送信中…' : '回答を送信する'}
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 5: トピック選択 ---- */}
        {step === 5 && (
          <div>
            <p className="text-xs font-semibold text-brand-600">あと1ステップで完了です</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-800">興味のあるトピックを選ぶ</h2>
            <p className="mt-1 text-xs text-slate-500">
              フォローしたトピックの新着アンケートをホームでお知らせします（0件のままでも進めます）。
            </p>

            <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {Object.entries(
                topics.reduce<Record<string, Topic[]>>((acc, t) => {
                  (acc[t.category] ??= []).push(t);
                  return acc;
                }, {})
              ).map(([category, categoryTopics]) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-bold text-slate-400">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryTopics.map((t) => {
                      const selected = selectedTopicIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTopic(t.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {topicError && (
              <p role="alert" className="mt-4 text-sm text-red-600">{topicError}</p>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => handleTopicSubmit([])}
                disabled={isTopicPending}
                className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
              >
                スキップ
              </button>
              <button
                onClick={() => handleTopicSubmit(selectedTopicIds)}
                disabled={isTopicPending}
                className="btn-3d btn-3d-primary flex-1 flex items-center justify-center gap-2 py-3 font-bold"
              >
                {isTopicPending && <Spinner className="h-4 w-4" />}
                次へ →
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 6: 完了・ポイント獲得 ---- */}
        {step === 6 && (
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
              ✦
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">ポイント獲得！</h2>

            <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
              <p className="text-sm text-slate-500">このアンケートの獲得ポイント</p>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-lg text-slate-400 line-through">20pt</span>
                <span className="text-slate-500">×</span>
                <span className="rounded-full bg-amber-200 px-3 py-0.5 text-sm font-bold text-amber-700">1.5倍</span>
              </div>
              <p className="mt-2 text-4xl font-extrabold text-amber-600">+ 30 pt</p>
              <p className="mt-1 text-sm text-slate-500">高品質回答として確定しました！</p>
            </div>

            <p className="mt-5 text-sm text-slate-600">
              早速、他のアンケートに回答してポイントを貯めたり、
              <br />
              自分のアンケートを作成してみましょう。
            </p>

            <button
              onClick={() => router.push('/')}
              className="btn-3d btn-3d-primary mt-8 w-full py-3 text-base font-bold"
            >
              ホームへ進む →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuestionBlockProps {
  number: number;
  label: string;
  required?: boolean;
  hint?: string;
  fieldKey?: string;
  privateFields?: string[];
  onTogglePrivate?: (field: string) => void;
  children: React.ReactNode;
}

function QuestionBlock({
  number,
  label,
  required,
  hint,
  fieldKey,
  privateFields = [],
  onTogglePrivate,
  children,
}: QuestionBlockProps) {
  const isPrivate = fieldKey ? privateFields.includes(fieldKey) : false;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {number}
          </span>
          <span className="font-semibold text-slate-800">
            {label}
            {required && <span className="ml-1 text-xs text-red-500">必須</span>}
          </span>
        </div>
        {fieldKey && onTogglePrivate && (
          <button
            type="button"
            onClick={() => onTogglePrivate(fieldKey)}
            className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
              isPrivate
                ? 'border-slate-400 bg-slate-200 text-slate-700'
                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
            }`}
          >
            {isPrivate ? '非公開' : '公開'}
          </button>
        )}
      </div>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}
