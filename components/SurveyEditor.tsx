'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSurveyAction } from '@/app/actions/survey';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import QuestionTypePicker from '@/components/QuestionTypePicker';
import SurveyPreview from '@/components/SurveyPreview';
import BranchFlow from '@/components/BranchFlow';
import QuestionTemplates from '@/components/QuestionTemplates';
import { validateEditorQuestion, hasBlockingWarning, type QuestionWarning } from '@/lib/domain/validation';
import type { QuestionSeed } from '@/lib/domain/questionTemplates';
import type {
  QuestionType,
  SectionMeta,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
  GridConfig,
  ScaleConfig,
  AttentionConfig,
  TargetConditions,
} from '@/lib/types/database';

/** 編集中の設問。config はタイプ別の緩い形で保持し、保存時にサービス層が正規化する。 */
interface EditorQuestion {
  key: string;
  type: QuestionType;
  text: string;
  description: string;
  required: boolean;
  options: string[];
  config: Partial<ScaleConfig & GridConfig & AttentionConfig>;
  section_index: number;
  /** 表示条件。sourceKey の設問で optionText が選ばれた時だけ表示。null は常に表示。 */
  condition: { sourceKey: string; optionText: string } | null;
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1';

function needsOptions(type: QuestionType) {
  return QuestionTypeRegistry.get(type).requiresOptionInput;
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function newQuestion(sectionIndex: number): EditorQuestion {
  return {
    key: uid(),
    type: 'single',
    text: '',
    description: '',
    required: false,
    options: ['', ''],
    config: {},
    section_index: sectionIndex,
    condition: null,
  };
}

/** テンプレートの種から編集用設問を生成する */
function questionFromSeed(seed: QuestionSeed, sectionIndex: number): EditorQuestion {
  const needs = needsOptions(seed.type);
  return {
    key: uid(),
    type: seed.type,
    text: seed.text,
    description: seed.description ?? '',
    required: seed.required ?? false,
    options: needs ? (seed.options && seed.options.length ? [...seed.options] : ['', '']) : [],
    config: { ...(seed.config ?? {}) },
    section_index: sectionIndex,
    condition: null,
  };
}

function fromSurvey(survey: SurveyWithQuestions | null): {
  title: string;
  description: string;
  requiredCount: number;
  deadline: string;
  sections: SectionMeta[];
  questions: EditorQuestion[];
  consentText: string;
  targetConditions: TargetConditions;
  minTrustScore: number | null;
  retentionMonths: number | null;
  unlisted: boolean;
} {
  if (!survey) {
    return {
      title: '',
      description: '',
      requiredCount: 10,
      deadline: '',
      sections: [{ title: '', description: '' }],
      questions: [newQuestion(0)],
      consentText: '',
      targetConditions: {},
      unlisted: false,
      minTrustScore: null,
      retentionMonths: null,
    };
  }
  const sections = survey.sections.length ? survey.sections : [{ title: '', description: '' }];
  // 先にキーを採番（条件の参照解決に使う）
  const keyByOrder = new Map<number, string>();
  const questions: EditorQuestion[] = survey.questions.map((q) => {
    const key = uid();
    keyByOrder.set(q.order_index, key);
    return {
      key,
      type: q.type,
      text: q.text,
      description: q.description ?? '',
      required: q.required,
      options: needsOptions(q.type) ? q.options.map((o) => o.text) : [],
      config: (q.config as Partial<ScaleConfig & GridConfig>) ?? {},
      section_index: Math.min(q.section_index, sections.length - 1),
      condition: null,
    };
  });
  // condition（保存形式: order_index 参照）を editor 形式（key 参照）へ復元
  survey.questions.forEach((q, i) => {
    const cond = q.condition;
    if (!cond) return;
    const sourceKey = keyByOrder.get(cond.sourceQuestionOrder);
    if (sourceKey) questions[i].condition = { sourceKey, optionText: cond.optionText };
  });
  return {
    title: survey.title,
    description: survey.description ?? '',
    requiredCount: survey.required_count,
    deadline: survey.deadline ?? '',
    sections,
    questions,
    consentText: survey.consent_text ?? '',
    targetConditions: survey.target_conditions ?? {},
    unlisted: survey.visibility === 'unlisted',
    minTrustScore: survey.min_trust_score,
    // retention_until（日時）から残り月数は復元できないため、編集時は再設定式にする
    retentionMonths: null,
  };
}

export default function SurveyEditor({ survey }: { survey: SurveyWithQuestions | null }) {
  const router = useRouter();
  const initial = fromSurvey(survey);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [requiredCount, setRequiredCount] = useState(initial.requiredCount);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [sections, setSections] = useState<SectionMeta[]>(initial.sections);
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial.questions);
  const [consentText, setConsentText] = useState(initial.consentText);
  const [targetConditions, setTargetConditions] = useState<TargetConditions>(
    initial.targetConditions
  );
  const [unlisted, setUnlisted] = useState(initial.unlisted);
  const [minTrustScore, setMinTrustScore] = useState<number | null>(initial.minTrustScore);
  const [retentionMonths, setRetentionMonths] = useState<number | null>(initial.retentionMonths);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // 右ペイン表示（プレビュー / 分岐フロー）と各種モーダル
  const [rightTab, setRightTab] = useState<'preview' | 'flow'>('preview');
  const [showRight, setShowRight] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSection, setTemplateSection] = useState(0);
  const [publishIssues, setPublishIssues] = useState<{ index: number; text: string; warnings: QuestionWarning[] }[] | null>(null);

  // セクション順に並べた表示順（条件の「先行設問」候補算出に使う）
  const orderedQuestions = [...questions].sort((a, b) => a.section_index - b.section_index);

  // 1回答あたりのポイントコスト目安（平均品質×1.0時。DB側の計算式と同じ：最低1pt）
  // 実際の消費は回答ごとに品質倍率（0〜×1.5）が掛かる。
  const costPerAnswer = Math.max(
    1,
    Math.ceil(
      questions.reduce((sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost, 0)
    )
  );
  const maxCostPerAnswer = Math.ceil(costPerAnswer * 1.5);

  // 設問単位のバリデーション警告（key → 警告一覧）
  const warningsByKey = useMemo(() => {
    const byKey = new Map(questions.map((q) => [q.key, q]));
    const map = new Map<string, QuestionWarning[]>();
    for (const q of questions) map.set(q.key, validateEditorQuestion(q, byKey));
    return map;
  }, [questions]);

  // ---- 設問操作 ----
  const updateQuestion = (key: string, patch: Partial<EditorQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const changeType = (key: string, type: QuestionType) => {
    const q = questions.find((x) => x.key === key)!;
    const options = needsOptions(type) && q.options.length === 0 ? ['', ''] : q.options;
    updateQuestion(key, { type, options });
  };

  const addQuestion = (sectionIndex: number) =>
    setQuestions((qs) => [...qs, newQuestion(sectionIndex)]);

  // テンプレート（種の配列）を指定セクションの末尾に追加
  const insertSeeds = (seeds: QuestionSeed[]) => {
    setQuestions((qs) => [...qs, ...seeds.map((s) => questionFromSeed(s, templateSection))]);
    setShowTemplates(false);
  };

  // 「マイテンプレート保存」用に現在の設問を種へ変換
  const currentSeeds: QuestionSeed[] = questions.map((q) => ({
    type: q.type,
    text: q.text,
    description: q.description || undefined,
    required: q.required,
    options: needsOptions(q.type) ? q.options : undefined,
    config: needsConfig(q.type) ? q.config : undefined,
  }));

  const duplicateQuestion = (key: string) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.key === key);
      if (idx < 0) return qs;
      const copy = {
        ...qs[idx],
        key: uid(),
        options: [...qs[idx].options],
        config: { ...qs[idx].config },
        condition: qs[idx].condition ? { ...qs[idx].condition } : null,
      };
      return [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
    });

  const removeQuestion = (key: string) =>
    setQuestions((qs) => qs.filter((q) => q.key !== key));

  // ドラッグした設問を、ドロップ先設問の直前へ移動し、ドロップ先のセクションを継承する
  const dropOnQuestion = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setQuestions((qs) => {
      const from = qs.findIndex((q) => q.key === dragKey);
      const to = qs.findIndex((q) => q.key === targetKey);
      if (from < 0 || to < 0) return qs;
      const moved = { ...qs[from], section_index: qs[to].section_index };
      const without = qs.filter((q) => q.key !== dragKey);
      const insertAt = without.findIndex((q) => q.key === targetKey);
      return [...without.slice(0, insertAt), moved, ...without.slice(insertAt)];
    });
    setDragKey(null);
  };

  // セクション末尾の空きエリアにドロップ → そのセクションの最後へ移動
  const dropOnSection = (sectionIndex: number) => {
    if (!dragKey) return;
    setQuestions((qs) => {
      const from = qs.findIndex((q) => q.key === dragKey);
      if (from < 0) return qs;
      const moved = { ...qs[from], section_index: sectionIndex };
      return [...qs.filter((q) => q.key !== dragKey), moved];
    });
    setDragKey(null);
  };

  // ---- 選択肢操作 ----
  const addOption = (key: string) => {
    const q = questions.find((x) => x.key === key)!;
    updateQuestion(key, { options: [...q.options, ''] });
  };
  const updateOption = (key: string, oi: number, value: string) => {
    const q = questions.find((x) => x.key === key)!;
    updateQuestion(key, { options: q.options.map((o, i) => (i === oi ? value : o)) });
  };
  const removeOption = (key: string, oi: number) => {
    const q = questions.find((x) => x.key === key)!;
    updateQuestion(key, { options: q.options.filter((_, i) => i !== oi) });
  };

  // ---- config（行・列）操作 ----
  const updateConfig = (key: string, patch: Partial<ScaleConfig & GridConfig & AttentionConfig>) => {
    const q = questions.find((x) => x.key === key)!;
    updateQuestion(key, { config: { ...q.config, ...patch } });
  };
  const updateListItem = (
    key: string,
    field: 'rows' | 'columns',
    i: number,
    value: string
  ) => {
    const q = questions.find((x) => x.key === key)!;
    const list = [...(q.config[field] ?? [])];
    list[i] = value;
    updateConfig(key, { [field]: list });
  };
  const addListItem = (key: string, field: 'rows' | 'columns') => {
    const q = questions.find((x) => x.key === key)!;
    updateConfig(key, { [field]: [...(q.config[field] ?? []), ''] });
  };
  const removeListItem = (key: string, field: 'rows' | 'columns', i: number) => {
    const q = questions.find((x) => x.key === key)!;
    updateConfig(key, { [field]: (q.config[field] ?? []).filter((_, idx) => idx !== i) });
  };

  // ---- セクション操作 ----
  const addSection = () => setSections((s) => [...s, { title: '', description: '' }]);
  const updateSection = (i: number, patch: Partial<SectionMeta>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));
  const removeSection = (i: number) => {
    if (sections.length <= 1) return;
    setSections((s) => s.filter((_, idx) => idx !== i));
    // 削除セクションの設問を1つ前に寄せ、以降の番号を詰める
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.section_index === i) return { ...q, section_index: Math.max(0, i - 1) };
        if (q.section_index > i) return { ...q, section_index: q.section_index - 1 };
        return q;
      })
    );
  };

  // ---- 保存 ----
  const submit = async (status: SurveyStatus) => {
    setError(null);
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!consentText.trim()) {
      setError('インフォームドコンセント文（研究目的・データの取り扱い・任意性の説明）を入力してください');
      return;
    }
    // 公開時のみ：設問単位のエラーが残っていれば一覧モーダルを出して中断する
    if (status === 'open') {
      const ordered0 = [...questions].sort((a, b) => a.section_index - b.section_index);
      const issues = ordered0
        .map((q, i) => ({ index: i, text: q.text, warnings: warningsByKey.get(q.key) ?? [] }))
        .filter((it) => hasBlockingWarning(it.warnings));
      if (issues.length > 0) {
        setPublishIssues(issues);
        return;
      }
    }
    // 設問は元の配列順を維持しつつ、セクション順 → 元順 で安定ソートして保存する
    const ordered = [...questions].sort((a, b) => a.section_index - b.section_index);
    // condition の参照（key）を保存後の並び順（order_index）に変換する
    const orderByKey = new Map(ordered.map((q, i) => [q.key, i]));
    // 単一セクションでタイトル・説明が空なら「セクションなし」として保存
    const sectionsPayload =
      sections.length === 1 && !sections[0].title.trim() && !sections[0].description.trim()
        ? []
        : sections;

    const payload: SurveyInput = {
      title,
      description: description || null,
      required_count: Number(requiredCount) || 0,
      deadline: deadline || null,
      status,
      sections: sectionsPayload,
      visibility: unlisted ? 'unlisted' : 'public',
      consent_text: consentText.trim() || null,
      target_conditions: targetConditions,
      min_trust_score: minTrustScore,
      retention_months: retentionMonths,
      questions: ordered.map((q, qi) => {
        // 条件元が自分より前にある場合のみ有効
        const srcOrder = q.condition ? orderByKey.get(q.condition.sourceKey) : undefined;
        const condition =
          q.condition && srcOrder !== undefined && srcOrder < qi
            ? { sourceQuestionOrder: srcOrder, optionText: q.condition.optionText }
            : null;
        return {
          type: q.type,
          text: q.text,
          description: q.description || null,
          required: q.required,
          options: q.options,
          config: needsConfig(q.type) ? (q.config as SurveyInput['questions'][number]['config']) : null,
          section_index: q.section_index,
          condition,
        };
      }),
    };

    const formData = new FormData();
    if (survey) formData.set('surveyId', survey.id);
    formData.set('payload', JSON.stringify(payload));

    setPending(true);
    const result = await saveSurveyAction({ error: null }, formData);
    setPending(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-6 lg:items-start">
      <div className="space-y-6">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setTemplateSection(0);
            setShowTemplates(true);
          }}
          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer"
        >
          テンプレートから追加
        </button>
        <button
          type="button"
          onClick={() => setShowRight((v) => !v)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer lg:inline-block"
        >
          {showRight ? '▶ プレビューを隠す' : '◀ プレビューを表示'}
        </button>
      </div>

      {/* 基本情報 */}
      <section className="rounded-xl bg-white border-t-8 border-t-indigo-500 border border-zinc-200 p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">説明文</label>
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">必要回答数</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={requiredCount}
              onChange={(e) => setRequiredCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">回答期限</label>
            <input
              type="date"
              className={inputClass}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={unlisted}
            onChange={(e) => setUnlisted(e.target.checked)}
          />
          <span>
            限定公開（リンクを知っている人のみ）
            <span className="block text-xs text-zinc-500">
              回答一覧には表示されません。共有リンクからはログインなしのゲストとして回答できます
              （ゲスト回答にはポイントが付与されません）。
            </span>
          </span>
        </label>
      </section>

      {/* 研究倫理・配信設定 */}
      <section className="rounded-xl bg-white border-t-8 border-t-emerald-500 border border-zinc-200 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-700">研究倫理・配信設定</h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            インフォームドコンセント文 <span className="text-red-500">*</span>
          </label>
          <p className="mb-1 text-xs text-zinc-500">
            研究目的・データの取り扱い（保存期間/公開範囲）・回答の任意性と中断の自由を説明してください。
            回答者には回答開始前に表示され、同意した人だけが回答できます。
          </p>
          <textarea
            className={inputClass}
            rows={5}
            placeholder={
              '例：本調査は◯◯の研究を目的としています。回答は統計的に処理され、個人が特定される形で公開されることはありません。回答は任意であり、いつでも中断できます。'
            }
            value={consentText}
            onChange={(e) => setConsentText(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">対象年齢（任意）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="下限"
                value={targetConditions.ageMin ?? ''}
                onChange={(e) =>
                  setTargetConditions((c) => ({
                    ...c,
                    ageMin: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              />
              <span className="text-sm text-zinc-400">〜</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="上限"
                value={targetConditions.ageMax ?? ''}
                onChange={(e) =>
                  setTargetConditions((c) => ({
                    ...c,
                    ageMax: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">対象の性別（任意）</label>
            <input
              className={inputClass}
              placeholder="カンマ区切り（例：男性,女性）。空欄＝制限なし"
              value={(targetConditions.genders ?? []).join(',')}
              onChange={(e) =>
                setTargetConditions((c) => ({
                  ...c,
                  genders: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">対象の職業（任意）</label>
            <input
              className={inputClass}
              placeholder="カンマ区切り（例：大学生,大学院生）。空欄＝制限なし"
              value={(targetConditions.occupations ?? []).join(',')}
              onChange={(e) =>
                setTargetConditions((c) => ({
                  ...c,
                  occupations: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                }))
              }
            />
            <p className="mt-1 text-xs text-zinc-400">
              条件を設定すると、該当する属性を公開している回答者にのみ配信されます。
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              回答者の最低信頼スコア（任意）
            </label>
            <select
              className={inputClass}
              value={minTrustScore ?? ''}
              onChange={(e) =>
                setMinTrustScore(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <option value="">制限なし</option>
              <option value={50}>50以上（標準）</option>
              <option value={70}>70以上（信頼）</option>
              <option value={90}>90以上（高信頼のみ）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              回答データの保持期間（任意）
            </label>
            <select
              className={inputClass}
              value={retentionMonths ?? ''}
              onChange={(e) =>
                setRetentionMonths(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <option value="">無期限</option>
              <option value={3}>3ヶ月</option>
              <option value={6}>6ヶ月</option>
              <option value={12}>1年</option>
              <option value={24}>2年</option>
            </select>
            <p className="mt-1 text-xs text-zinc-400">
              期間を過ぎた回答データは自動削除されます（個人情報保護法/GDPR対応）。
            </p>
          </div>
        </div>
      </section>

      {/* セクションごとに設問を表示 */}
      {sections.map((section, si) => (
        <div key={si} className="space-y-4">
          {/* セクション見出し（単一・無題のセクションは表示しない） */}
          {(sections.length > 1 || section.title || section.description) && (
            <section className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700">
                  セクション {si + 1} / {sections.length}
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(si)}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    セクション削除
                  </button>
                )}
              </div>
              <input
                className={inputClass}
                placeholder="セクションのタイトル"
                value={section.title}
                onChange={(e) => updateSection(si, { title: e.target.value })}
              />
              <textarea
                className={inputClass}
                rows={2}
                placeholder="セクションの説明（任意）"
                value={section.description}
                onChange={(e) => updateSection(si, { description: e.target.value })}
              />
            </section>
          )}

          {questions
            .filter((q) => q.section_index === si)
            .map((q) => {
              const globalIndex = questions.findIndex((x) => x.key === q.key);
              const warns = warningsByKey.get(q.key) ?? [];
              const hasError = warns.some((w) => w.level === 'error');
              return (
                <section
                  key={q.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOnQuestion(q.key)}
                  onDragEnd={() => setDragKey(null)}
                  className={`rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3 ${
                    dragKey === q.key ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {/* ドラッグはこのハンドルからのみ開始する。
                          設問カード全体を draggable にすると、入力欄でのテキスト選択が
                          ドラッグ扱いになりカードが薄くなる不具合（issue #5）が起きるため。 */}
                      <span
                        draggable
                        onDragStart={() => setDragKey(q.key)}
                        className="cursor-grab select-none text-zinc-500"
                        title="ドラッグで並べ替え"
                      >
                        ⠿ 設問 {globalIndex + 1}
                      </span>
                      {warns.length > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            hasError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}
                          title={warns.map((w) => w.message).join(' / ')}
                        >
                          {hasError ? '⚠ 要修正' : '⚠ 注意'} {warns.length}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 text-xs">
                      {sections.length > 1 && (
                        <select
                          className="rounded border border-zinc-300 px-1 py-1"
                          value={q.section_index}
                          onChange={(e) => updateQuestion(q.key, { section_index: Number(e.target.value) })}
                          title="セクションを移動"
                        >
                          {sections.map((_, idx) => (
                            <option key={idx} value={idx}>
                              S{idx + 1}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={() => duplicateQuestion(q.key)} className="rounded px-2 py-1 hover:bg-zinc-100 cursor-pointer">複製</button>
                      <button type="button" onClick={() => removeQuestion(q.key)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50 cursor-pointer">削除</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <QuestionTypePicker
                        value={q.type}
                        onChange={(type) => changeType(q.key, type)}
                      />
                    </div>
                    <input
                      className={inputClass + ' sm:col-span-2'}
                      placeholder="設問文を入力"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
                    />
                  </div>

                  <input
                    className={inputClass}
                    placeholder="補足説明（任意）"
                    value={q.description}
                    onChange={(e) => updateQuestion(q.key, { description: e.target.value })}
                  />

                  {/* 選択肢（single/multiple/dropdown） */}
                  {needsOptions(q.type) && (
                    <div className="space-y-2 pl-1">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 w-5">{oi + 1}.</span>
                          <input
                            className={inputClass}
                            placeholder={`選択肢 ${oi + 1}`}
                            value={o}
                            data-opt={`${q.key}:${oi}`}
                            onChange={(e) => updateOption(q.key, oi, e.target.value)}
                            onKeyDown={(e) => {
                              // Enterで次の選択肢を追加してフォーカス移動（Googleフォーム相当）。
                              // IME変換確定のEnterは無視する（issue #4）。
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                const nextIndex = q.options.length;
                                addOption(q.key);
                                setTimeout(() => {
                                  document
                                    .querySelector<HTMLInputElement>(`[data-opt="${q.key}:${nextIndex}"]`)
                                    ?.focus();
                                }, 0);
                              }
                            }}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(q.key, oi)} className="text-red-500 text-sm px-1 cursor-pointer">×</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(q.key)} className="text-sm text-indigo-600 hover:underline cursor-pointer">
                        ＋ 選択肢を追加
                      </button>
                    </div>
                  )}

                  {/* スケール設定 */}
                  {q.type === 'scale' && (
                    <div className="space-y-3 pl-1">
                      <div className="flex items-center gap-2 text-sm">
                        <select
                          className="rounded-md border border-zinc-300 px-2 py-1"
                          value={q.config.min ?? 1}
                          onChange={(e) => updateConfig(q.key, { min: Number(e.target.value) })}
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                        </select>
                        <span>〜</span>
                        <select
                          className="rounded-md border border-zinc-300 px-2 py-1"
                          value={q.config.max ?? 5}
                          onChange={(e) => updateConfig(q.key, { max: Number(e.target.value) })}
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className={inputClass}
                          placeholder="最小値のラベル（任意）"
                          value={q.config.minLabel ?? ''}
                          onChange={(e) => updateConfig(q.key, { minLabel: e.target.value })}
                        />
                        <input
                          className={inputClass}
                          placeholder="最大値のラベル（任意）"
                          value={q.config.maxLabel ?? ''}
                          onChange={(e) => updateConfig(q.key, { maxLabel: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* グリッド設定 */}
                  {q.type === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1">
                      <GridListEditor
                        label="行"
                        items={q.config.rows ?? []}
                        onChange={(i, v) => updateListItem(q.key, 'rows', i, v)}
                        onAdd={() => addListItem(q.key, 'rows')}
                        onRemove={(i) => removeListItem(q.key, 'rows', i)}
                      />
                      <div className="space-y-2">
                        <GridListEditor
                          label="列"
                          items={q.config.columns ?? []}
                          onChange={(i, v) => updateListItem(q.key, 'columns', i, v)}
                          onAdd={() => addListItem(q.key, 'columns')}
                          onRemove={(i) => removeListItem(q.key, 'columns', i)}
                        />
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            checked={!!q.config.multiple}
                            onChange={(e) => updateConfig(q.key, { multiple: e.target.checked })}
                          />
                          各行で複数選択を許可（チェックボックスグリッド）
                        </label>
                      </div>
                    </div>
                  )}

                  {/* アテンションチェック：正解選択肢の指定 */}
                  {q.type === 'attention' && (
                    <div className="space-y-2 rounded-lg border border-dashed border-red-300 bg-red-50/50 p-3 text-sm">
                      <p className="text-xs text-red-700">
                        回答者が設問を読んでいるか確認する設問です。指定した正解以外を選んだ回答は
                        品質スコア0（報酬なし）になります。例：「この設問では『3番目』を選んでください」
                      </p>
                      <label className="flex items-center gap-2 text-zinc-700">
                        正解の選択肢：
                        <select
                          className="rounded-md border border-zinc-300 px-2 py-1"
                          value={q.config.correctOptionText ?? ''}
                          onChange={(e) => updateConfig(q.key, { correctOptionText: e.target.value })}
                        >
                          <option value="">（選択してください）</option>
                          {q.options
                            .map((o) => o.trim())
                            .filter(Boolean)
                            .map((o, i) => (
                              <option key={i} value={o}>
                                {o}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {q.type === 'paragraph' && (
                    <p className="text-xs text-zinc-500 pl-1">回答者は長文で回答します。</p>
                  )}
                  {q.type === 'date' && (
                    <p className="text-xs text-zinc-500 pl-1">回答者は日付を選択します。</p>
                  )}

                  <ConditionEditor
                    question={q}
                    candidates={orderedQuestions.slice(0, orderedQuestions.findIndex((x) => x.key === q.key))}
                    onChange={(condition) => updateQuestion(q.key, { condition })}
                  />

                  <label className="flex items-center gap-2 pt-1 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                    />
                    必須
                  </label>

                  {warns.length > 0 && (
                    <ul className="space-y-1 rounded-md bg-amber-50/70 border border-amber-200 p-2 text-xs">
                      {warns.map((w, wi) => (
                        <li key={wi} className={w.level === 'error' ? 'text-red-700' : 'text-amber-700'}>
                          {w.level === 'error' ? '⚠' : 'ℹ'} {w.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

          {/* セクション末尾のドロップ／追加エリア */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOnSection(si)}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestion(si)}
                className="flex-1 rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer"
              >
                ＋ 設問を追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setTemplateSection(si);
                  setShowTemplates(true);
                }}
                className="rounded-xl border-2 border-dashed border-indigo-300 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              >
                テンプレート
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="w-full rounded-xl border-2 border-dashed border-indigo-300 py-2 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer"
      >
        ＋ セクションを追加（ページ分割）
      </button>

      {/* ポイントコストの目安（回答ごとの品質比例課金） */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-slate-700">
        <p className="font-bold text-brand-700">
          1回答あたり 平均 {costPerAnswer}pt
          <span className="ml-1 font-normal text-slate-500">
            （回答品質により 0〜{maxCostPerAnswer}pt）
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          ポイントは公開時ではなく、回答が届くたびにその回答の品質に応じて消費されます。
          必要回答数 {Number(requiredCount) || 0} 件がすべて平均品質なら合計 約
          {costPerAnswer * (Number(requiredCount) || 0)}pt の消費見込みです
          （公開には最低 {costPerAnswer}pt の残高が必要）。
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 操作ボタン */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('draft')}
          className="rounded-md bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 cursor-pointer"
        >
          下書き保存
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('open')}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {survey ? '保存して公開' : '公開する'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-md px-5 py-2 text-sm text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          キャンセル
        </button>
      </div>
      </div>

      {/* 右ペイン：回答者プレビュー / 分岐フロー */}
      {showRight && (
        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-3 inline-flex overflow-hidden rounded-md border border-zinc-300 text-xs">
              <button
                type="button"
                onClick={() => setRightTab('preview')}
                className={`px-3 py-1 ${rightTab === 'preview' ? 'bg-indigo-600 text-white' : 'bg-white text-zinc-600'}`}
              >
                プレビュー
              </button>
              <button
                type="button"
                onClick={() => setRightTab('flow')}
                className={`px-3 py-1 ${rightTab === 'flow' ? 'bg-indigo-600 text-white' : 'bg-white text-zinc-600'}`}
              >
                分岐フロー
              </button>
            </div>
            {rightTab === 'preview' ? (
              <SurveyPreview data={{ title, description, sections, questions }} />
            ) : (
              <BranchFlow questions={questions} sections={sections} />
            )}
          </div>
        </aside>
      )}

      {/* テンプレートライブラリ */}
      {showTemplates && (
        <QuestionTemplates
          onInsert={insertSeeds}
          onClose={() => setShowTemplates(false)}
          currentQuestions={currentSeeds}
        />
      )}

      {/* 公開前の未解決バリデーション一覧 */}
      {publishIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-red-700">⚠ 公開前に修正が必要です</h2>
            <p className="mb-3 text-xs text-zinc-500">
              次の設問にエラーがあります。修正してから公開してください。
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {publishIssues.map((it) => (
                <li key={it.index} className="rounded-md border border-red-200 bg-red-50 p-2 text-sm">
                  <p className="font-medium text-zinc-800">
                    設問 {it.index + 1}：{it.text.trim() || '（無題）'}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                    {it.warnings
                      .filter((w) => w.level === 'error')
                      .map((w, wi) => (
                        <li key={wi}>{w.message}</li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishIssues(null)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
              >
                修正する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** scale/grid/attention のみ config を持つ */
function needsConfig(type: QuestionType) {
  return type === 'scale' || type === 'grid' || type === 'attention';
}

/**
 * 表示条件（分岐）の編集UI。
 * 「この設問より前にある選択式設問」で特定の選択肢が選ばれた時だけ、この設問を表示する。
 */
function ConditionEditor({
  question,
  candidates,
  onChange,
}: {
  question: EditorQuestion;
  candidates: EditorQuestion[];
  onChange: (condition: { sourceKey: string; optionText: string } | null) => void;
}) {
  // 条件元になれるのは「選択肢を持つ設問（single/multiple/dropdown）」のみ
  const sources = candidates.filter((c) => needsOptions(c.type) && c.options.some((o) => o.trim()));
  const cond = question.condition;
  const enabled = !!cond;

  if (sources.length === 0) {
    // 条件元になりうる先行設問がまだ無い
    return null;
  }

  const source = cond ? sources.find((s) => s.key === cond.sourceKey) ?? null : null;
  const sourceOptions = (source?.options ?? []).map((o) => o.trim()).filter(Boolean);

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              const first = sources[0];
              onChange({ sourceKey: first.key, optionText: first.options.map((o) => o.trim()).find(Boolean) ?? '' });
            } else {
              onChange(null);
            }
          }}
        />
        条件付きで表示する（特定の回答をした人だけに見せる）
      </label>

      {enabled && cond && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-700">
          <select
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={cond.sourceKey}
            onChange={(e) => {
              const next = sources.find((s) => s.key === e.target.value)!;
              onChange({ sourceKey: next.key, optionText: next.options.map((o) => o.trim()).find(Boolean) ?? '' });
            }}
          >
            {sources.map((s, i) => (
              <option key={s.key} value={s.key}>
                {`設問「${s.text.trim() || `（無題 ${i + 1}）`}」`}
              </option>
            ))}
          </select>
          <span>で</span>
          <select
            className="rounded-md border border-zinc-300 px-2 py-1"
            value={cond.optionText}
            onChange={(e) => onChange({ sourceKey: cond.sourceKey, optionText: e.target.value })}
          >
            {sourceOptions.map((o, i) => (
              <option key={i} value={o}>
                {o}
              </option>
            ))}
          </select>
          <span>を選んだ人だけに表示</span>
        </div>
      )}
    </div>
  );
}

/** グリッドの行・列リストの編集UI */
function GridListEditor({
  label,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-600">{label}</p>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputClass}
            placeholder={`${label} ${i + 1}`}
            value={it}
            onChange={(e) => onChange(i, e.target.value)}
          />
          {items.length > 0 && (
            <button type="button" onClick={() => onRemove(i)} className="text-red-500 text-sm px-1 cursor-pointer">×</button>
          )}
        </div>
      ))}
      <button type="button" onClick={onAdd} className="text-sm text-indigo-600 hover:underline cursor-pointer">
        ＋ {label}を追加
      </button>
    </div>
  );
}
