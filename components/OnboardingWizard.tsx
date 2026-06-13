'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboardingAction, type OnboardingActionState } from '@/app/actions/onboarding';
import { inputClass } from '@/lib/ui/styles';
import { Spinner } from '@/components/ui/Spinner';

const initial: OnboardingActionState = { error: null };

const STEPS = 5;

const GENDERS = ['男性', '女性', 'ノンバイナリー', '回答しない'];
const OCCUPATIONS = ['中学生', '高校生', '学部生', '大学院生（修士）', '大学院生（博士）', '研究者・教員', '社会人', 'その他'];
const GRADES = ['中1', '中2', '中3', '高1', '高2', '高3', '大学1年', '大学2年', '大学3年', '大学4年', 'M1', 'M2', 'D1', 'D2', 'D3以上'];

interface Props {
  nickname: string;
}

export default function OnboardingWizard({ nickname }: Props) {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // step4のフォーム値
  const [form, setForm] = useState({
    nickname: nickname,
    age: '',
    gender: '',
    occupation: '',
    grade: '',
    affiliation: '',
    field: '',
    major: '',
  });
  const [privateFields, setPrivateFields] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const togglePrivate = (field: string) => {
    setPrivateFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
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

  const progress = Math.round((step / STEPS) * 100);

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
        <p className="mt-1 text-right text-xs text-slate-400">{step} / {STEPS}</p>
      </div>

      <div className="card-3d w-full max-w-lg p-8 animate-[fade-in-up_0.4s_ease-out]">

        {/* ---- STEP 1: ようこそ ---- */}
        {step === 1 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-4xl">
              🎉
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">ようこそ、キキタイへ！</h1>
            <p className="mt-3 text-slate-600">
              <span className="font-semibold text-brand-600">{nickname}</span> さん、登録ありがとうございます。
            </p>
            <p className="mt-2 text-sm text-slate-500">
              キキタイは、アンケートで繋がる学生・研究者のためのプラットフォームです。
              ちょっと説明させてください！
            </p>
            <button
              onClick={() => setStep(2)}
              className="btn-3d btn-3d-primary mt-8 w-full py-3 text-base font-bold"
            >
              さっそく見てみる →
            </button>
          </div>
        )}

        {/* ---- STEP 2: サービス説明 ---- */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">キキタイってどんなサービス？</h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-4 rounded-xl bg-brand-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg text-white font-bold">1</div>
                <div>
                  <p className="font-bold text-slate-800">アンケートに回答してポイントを獲得</p>
                  <p className="mt-1 text-sm text-slate-600">他の人のアンケートに答えるとポイントがもらえます。良質な回答なら1.5倍！</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl bg-brand-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg text-white font-bold">2</div>
                <div>
                  <p className="font-bold text-slate-800">アンケート作成は完全無料</p>
                  <p className="mt-1 text-sm text-slate-600">Googleフォーム感覚でアンケートを作れます。公開はポイントを使います。</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl bg-brand-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg text-white font-bold">3</div>
                <div>
                  <p className="font-bold text-slate-800">学生・研究者同士で回答し合う</p>
                  <p className="mt-1 text-sm text-slate-600">回答してもらいながら、あなたも他の研究に貢献。Win-Winの交換経済圏。</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
              >
                ← 戻る
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-3d btn-3d-primary flex-1 py-3 font-bold"
              >
                なるほど！ →
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3: ポイントゲット ---- */}
        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
              ✦
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">まずはポイントをゲットしよう！</h2>
            <p className="mt-3 text-slate-600">
              あなたのことを教えてもらうことで、
              <br />
              ポイントを獲得できます。
            </p>
            <div className="mt-6 rounded-2xl border-2 border-brand-200 bg-brand-50 p-5">
              <p className="text-sm text-slate-500">次のアンケートを完了すると</p>
              <p className="mt-1 text-3xl font-extrabold text-brand-600">
                20pt <span className="text-lg text-slate-500">×</span> <span className="text-amber-500">1.5倍</span>
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800">= 30ポイント獲得！</p>
              <p className="mt-2 text-xs text-slate-400">良質な回答として高評価扱いで確定します</p>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
              >
                ← 戻る
              </button>
              <button
                onClick={() => setStep(4)}
                className="btn-3d btn-3d-primary flex-1 py-3 font-bold"
              >
                アンケートに答える →
              </button>
            </div>
          </div>
        )}

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

              {/* Q2 年齢 */}
              <QuestionBlock
                number={2}
                label="年齢"
                fieldKey="age"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className={inputClass}
                  placeholder="例：22"
                  min={10}
                  max={120}
                />
              </QuestionBlock>

              {/* Q3 性別 */}
              <QuestionBlock
                number={3}
                label="性別"
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
                fieldKey="occupation"
                privateFields={privateFields}
                onTogglePrivate={togglePrivate}
              >
                <div className="flex flex-wrap gap-2">
                  {OCCUPATIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setForm({ ...form, occupation: form.occupation === o ? '' : o })}
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

              {/* Q5 学年（学生の場合） */}
              {(form.occupation.includes('学部生') || form.occupation.includes('大学院生')) && (
                <QuestionBlock
                  number={5}
                  label="学年"
                  fieldKey="grade"
                  privateFields={privateFields}
                  onTogglePrivate={togglePrivate}
                >
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map((g) => (
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
                number={form.occupation.includes('学部生') || form.occupation.includes('大学院生') ? 6 : 5}
                label="所属機関・大学名"
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
                number={form.occupation.includes('学部生') || form.occupation.includes('大学院生') ? 7 : 6}
                label="研究分野・専攻"
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
                onClick={() => setStep(3)}
                disabled={isPending}
                className="btn-3d btn-3d-secondary flex-1 py-2 text-sm"
              >
                ← 戻る
              </button>
              <button
                onClick={handleSubmitProfile}
                disabled={isPending || !form.nickname.trim()}
                className="btn-3d btn-3d-primary flex-1 flex items-center justify-center gap-2 py-3 font-bold"
              >
                {isPending && <Spinner className="h-4 w-4" />}
                {isPending ? '送信中…' : '回答を送信する'}
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 5: 完了・ポイント獲得 ---- */}
        {step === 5 && (
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
