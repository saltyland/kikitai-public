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
import SurveyGeneratorModal from '@/components/SurveyGeneratorModal';
import type { GeneratedSurveyDraft } from '@/lib/domain/generation';
import type {
  QuestionType,
  SectionMeta,
  SignalMeta,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
  GridConfig,
  ScaleConfig,
  AttentionConfig,
  TargetConditions,
  EvaluationRole,
} from '@/lib/types/database';

/**
 * 通常公開アンケート用のフルエディタ。
 * インフォームドコンセント・配信設定・AI品質判定・ポイント計算など
 * 通常公開に必要な全機能を含む。
 */

interface EditorQuestion {
  key: string;
  type: QuestionType;
  text: string;
  description: string;
  required: boolean;
  options: string[];
  config: Partial<ScaleConfig & GridConfig & AttentionConfig>;
  section_index: number;
  condition: { sourceKey: string; optionTexts: string[] } | null;
  signal_meta?: SignalMeta | null;
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1';

const DEFAULT_CONSENT_TEXT =
  '本調査は学術研究を目的として実施しています。\n' +
  'ご回答いただいた内容は統計的に処理され、個人が特定される形で公開されることはありません。\n' +
  '回答は任意であり、いつでも中断することができます（途中までの入力は自動的に保存されます）。\n' +
  '取得したデータは研究目的にのみ利用し、定められた保持期間の経過後に適切に破棄します。\n' +
  '以上にご同意いただける場合のみ、回答にお進みください。';

function needsOptions(type: QuestionType) {
  return QuestionTypeRegistry.get(type).requiresOptionInput;
}

function needsConfig(type: QuestionType) {
  return type === 'scale' || type === 'grid' || type === 'attention';
}

function canBeConditionSource(type: QuestionType): boolean {
  return needsOptions(type) || type === 'scale';
}

function conditionSourceValues(q: EditorQuestion): string[] {
  if (q.type === 'scale') {
    const min = q.config.min === 0 ? 0 : 1;
    const rawMax =
      typeof q.config.max === 'number' && Number.isFinite(q.config.max)
        ? Math.round(q.config.max)
        : 5;
    const max = Math.min(10, Math.max(min + 1, rawMax));
    const values: string[] = [];
    for (let v = min; v <= max; v++) values.push(String(v));
    return values;
  }
  return q.options.map((o) => o.trim()).filter(Boolean);
}

function conditionSourceValueLabel(q: EditorQuestion, value: string, values: string[]): string {
  if (q.type === 'scale') {
    if (value === values[0] && q.config.minLabel?.trim()) return `${value}（${q.config.minLabel.trim()}）`;
    if (value === values[values.length - 1] && q.config.maxLabel?.trim())
      return `${value}（${q.config.maxLabel.trim()}）`;
  }
  return value;
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** pairKey から決定論的なTailwindボーダー色クラスを生成する */
function pairKeyBorderColor(pairKey: string): string {
  let hash = 0;
  for (const ch of pairKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const colors = [
    'border-l-blue-400',
    'border-l-purple-400',
    'border-l-emerald-400',
    'border-l-orange-400',
    'border-l-pink-400',
  ];
  return colors[hash % colors.length];
}

const ROLE_LABELS: Record<EvaluationRole, string> = {
  standard: '通常',
  attention_check: 'アテンションチェック',
  consistency_anchor: '一貫性アンカー',
  consistency_check: '一貫性チェック',
  open_signal: '品質シグナル（自由記述）',
};

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
  consentEnabled: boolean;
  consentText: string;
  targetConditions: TargetConditions;
  minTrustScore: number | null;
  retentionMonths: number | null;
} {
  if (!survey) {
    const defaultDeadline = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split('T')[0];
    })();
    return {
      title: '',
      description: '',
      requiredCount: 10,
      deadline: defaultDeadline,
      sections: [{ title: '', description: '' }],
      questions: [newQuestion(0)],
      consentEnabled: true,
      consentText: DEFAULT_CONSENT_TEXT,
      targetConditions: {},
      minTrustScore: null,
      retentionMonths: null,
    };
  }
  const sections = survey.sections.length ? survey.sections : [{ title: '', description: '' }];
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
  survey.questions.forEach((q, i) => {
    const cond = q.condition;
    if (!cond) return;
    const sourceKey = keyByOrder.get(cond.sourceQuestionOrder);
    if (sourceKey) questions[i].condition = { sourceKey, optionTexts: cond.optionTexts ?? (cond.optionText ? [cond.optionText] : []) };
  });
  return {
    title: survey.title,
    description: survey.description ?? '',
    requiredCount: survey.required_count,
    deadline: survey.deadline ?? '',
    sections,
    questions,
    consentEnabled: !!survey.consent_text?.trim(),
    consentText: survey.consent_text?.trim() ? survey.consent_text : DEFAULT_CONSENT_TEXT,
    targetConditions: survey.target_conditions ?? {},
    minTrustScore: survey.min_trust_score,
    retentionMonths: null,
  };
}

export default function PublicSurveyEditor({
  survey,
}: {
  survey: SurveyWithQuestions | null;
}) {
  const router = useRouter();
  const initial = fromSurvey(survey);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [requiredCount, setRequiredCount] = useState(initial.requiredCount);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [sections, setSections] = useState<SectionMeta[]>(initial.sections);
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial.questions);
  const [consentEnabled, setConsentEnabled] = useState(initial.consentEnabled);
  const [consentText, setConsentText] = useState(initial.consentText);
  const [targetConditions, setTargetConditions] = useState<TargetConditions>(initial.targetConditions);
  const [minTrustScore, setMinTrustScore] = useState<number | null>(initial.minTrustScore);
  const [retentionMonths, setRetentionMonths] = useState<number | null>(initial.retentionMonths);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);

  const maxDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }, []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; deadline?: string; consent?: string; general?: string }>({});
  const [pending, setPending] = useState(false);
  const [rightTab, setRightTab] = useState<'preview' | 'flow'>('preview');
  const [showRight, setShowRight] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSection, setTemplateSection] = useState(0);
  const [publishIssues, setPublishIssues] = useState<{ index: number; key: string; text: string; warnings: QuestionWarning[] }[] | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const STEP_LABELS = ['基本情報', '説明文と配信設定', '設問を作る'] as const;

  const orderedQuestions = [...questions].sort((a, b) => a.section_index - b.section_index);

  const costPerAnswer = Math.max(
    1,
    Math.ceil(questions.reduce((sum, q) => sum + QuestionTypeRegistry.get(q.type).pointCost, 0))
  );
  const maxCostPerAnswer = Math.ceil(costPerAnswer * 1.5);

  const warningsByKey = useMemo(() => {
    const byKey = new Map(questions.map((q) => [q.key, q]));
    const map = new Map<string, QuestionWarning[]>();
    for (const q of questions) map.set(q.key, validateEditorQuestion(q, byKey));
    return map;
  }, [questions]);

  const goNextFromStep1 = () => {
    const errors: { title?: string; deadline?: string } = {};
    if (!title.trim()) errors.title = 'タイトルを入力してください';
    if (!deadline) {
      errors.deadline = '回答期限を設定してください';
    } else if (deadline > maxDeadline) {
      errors.deadline = '回答期限は本日から2週間以内に設定してください';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTimeout(() => {
        const firstId = errors.title ? 'field-title' : 'field-deadline';
        document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  const goNextFromStep2 = () => {
    if (consentEnabled && !consentText.trim()) {
      setFieldErrors({
        consent: '回答者への説明文の内容を入力してください（研究の目的・データの扱い・とちゅうでやめられること）',
      });
      setTimeout(
        () => document.getElementById('field-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        0
      );
      return;
    }
    setFieldErrors({});
    setStep(3);
    window.scrollTo({ top: 0 });
  };

  const goBack = () => {
    setFieldErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
    window.scrollTo({ top: 0 });
  };

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

  const insertSeeds = (seeds: QuestionSeed[]) => {
    setQuestions((qs) => [...qs, ...seeds.map((s) => questionFromSeed(s, templateSection))]);
    setShowTemplates(false);
  };

  /** GeneratedSurveyDraft をEditorの設問リストに流し込む */
  const handleGenerated = (draft: GeneratedSurveyDraft) => {
    if (questions.length > 0) {
      const ok = window.confirm(
        `現在の${questions.length}問の設問が削除され、AIが生成した${draft.questions.length}問に置き換えられます。続けますか？`
      );
      if (!ok) return;
    }
    const newQuestions: EditorQuestion[] = draft.questions.map((q) => {
      // attention タイプと attention_check ロールの整合性を保つ
      const signal_meta: SignalMeta = q.type === 'attention'
        ? { ...q.signal_meta, role: 'attention_check' }
        : q.signal_meta;
      const config = (q.config ?? {}) as Partial<ScaleConfig & GridConfig & AttentionConfig>;
      // attention タイプで正解が未設定の場合、最初の選択肢を自動で正解にする
      if (q.type === 'attention' && !config.correctOptionText?.trim() && q.options.length > 0) {
        config.correctOptionText = q.options[0];
      }
      return {
        key: uid(),
        type: q.type,
        text: q.text,
        description: q.description ?? '',
        required: q.required,
        options: q.options,
        config,
        section_index: 0,
        condition: null,
        signal_meta,
      };
    });
    setTitle(draft.title);
    setDescription(draft.description);
    setQuestions(newQuestions);
    // ステップ3（設問作成）に移動してすぐ確認できるようにする
    setStep(3);
    window.scrollTo({ top: 0 });
  };

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

  // ---- config 操作 ----
  const updateConfig = (key: string, patch: Partial<ScaleConfig & GridConfig & AttentionConfig>) => {
    const q = questions.find((x) => x.key === key)!;
    updateQuestion(key, { config: { ...q.config, ...patch } });
  };
  const updateListItem = (key: string, field: 'rows' | 'columns', i: number, value: string) => {
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
  const updateSection = (i: number, patch: Partial<SectionMeta>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));
  const removeSection = (i: number) => {
    if (sections.length <= 1) return;
    setSections((s) => s.filter((_, idx) => idx !== i));
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
    setFieldErrors({});
    const errors: { title?: string; deadline?: string; consent?: string } = {};
    if (!title.trim()) errors.title = 'タイトルを入力してください';
    if (!deadline) {
      errors.deadline = '回答期限を設定してください';
    } else if (deadline > maxDeadline) {
      errors.deadline = '回答期限は本日から2週間以内に設定してください';
    }
    if (consentEnabled && !consentText.trim())
      errors.consent = '回答者への説明文の内容を入力してください（研究の目的・データの扱い・とちゅうでやめられること）';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (status === 'open') {
      setShowValidation(true);
      const ordered0 = [...questions].sort((a, b) => a.section_index - b.section_index);
      const issues = ordered0
        .map((q, i) => ({ index: i, key: q.key, text: q.text, warnings: warningsByKey.get(q.key) ?? [] }))
        .filter((it) => hasBlockingWarning(it.warnings));
      if (issues.length > 0) {
        setPublishIssues(issues);
        return;
      }
    }
    const ordered = [...questions].sort((a, b) => a.section_index - b.section_index);
    const orderByKey = new Map(ordered.map((q, i) => [q.key, i]));
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
      visibility: 'public',
      share_link_no_reward: false,
      consent_text: consentEnabled ? consentText.trim() || null : null,
      target_conditions: targetConditions,
      min_trust_score: minTrustScore,
      retention_months: retentionMonths,
      questions: ordered.map((q, qi) => {
        const srcOrder = q.condition ? orderByKey.get(q.condition.sourceKey) : undefined;
        const condition =
          q.condition && srcOrder !== undefined && srcOrder < qi
            ? { sourceQuestionOrder: srcOrder, optionTexts: q.condition.optionTexts }
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
          signal_meta: q.signal_meta ?? null,
        };
      }),
    };

    const formData = new FormData();
    if (survey) formData.set('surveyId', survey.id);
    formData.set('payload', JSON.stringify(payload));

    setPending(true);
    const result = await saveSurveyAction({ error: null }, formData);
    setPending(false);
    if (result?.error) setFieldErrors({ general: result.error });
  };

  return (
    <div className={`lg:gap-6 lg:items-start ${step === 3 && showRight ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]' : ''}`}>
      <div className="space-y-6">
        {/* ステップインジケーター */}
        <ol className="flex items-center gap-2 text-sm">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const state = n === step ? 'current' : n < step ? 'done' : 'todo';
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                    state === 'current'
                      ? 'bg-brand-600 text-white font-medium'
                      : state === 'done'
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      state === 'current'
                        ? 'bg-white text-brand-600'
                        : state === 'done'
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-300 text-white'
                    }`}
                  >
                    {state === 'done' ? '✓' : n}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
                {n < 3 && <span className="text-slate-300">―</span>}
              </li>
            );
          })}
        </ol>

        {/* ステップ3ツールバー */}
        {step === 3 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGeneratorModal(true)}
              className="rounded-md border border-brand-400 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 cursor-pointer flex items-center gap-1.5"
            >
              ✨ AIで設問を生成
            </button>
            <button
              type="button"
              onClick={() => { setTemplateSection(0); setShowTemplates(true); }}
              className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 cursor-pointer"
            >
              テンプレートから追加
            </button>
            {!showRight && (
              <button
                type="button"
                onClick={() => setShowRight(true)}
                className="hidden lg:inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ◀ プレビューを表示
              </button>
            )}
          </div>
        )}

        {/* ステップ1：基本情報 */}
        {step === 1 && (
          <section className="rounded-xl bg-white border-t-8 border-t-brand-500 border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="field-title"
                className={inputClass + (fieldErrors.title ? ' border-red-400' : '')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">説明文</label>
              <textarea
                className={inputClass}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">必要回答数</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  回答期限 <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-deadline"
                  type="date"
                  min={todayStr}
                  max={maxDeadline}
                  className={inputClass + (fieldErrors.deadline ? ' border-red-400' : '')}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                {fieldErrors.deadline && <p className="mt-1 text-xs text-red-600">{fieldErrors.deadline}</p>}
                <p className="mt-1 text-xs text-slate-400">本日から最大2週間以内で設定してください</p>
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md px-5 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={goNextFromStep1}
              className="btn-3d btn-3d-primary px-6 py-2 text-sm cursor-pointer"
            >
              次へ：説明文と配信設定 ▶
            </button>
          </div>
        )}

        {/* ステップ2：インフォームドコンセント */}
        {step === 2 && (
          <section className="rounded-xl bg-white border-t-8 border-t-emerald-500 border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700">回答者への説明文（インフォームドコンセント）</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">回答者への説明文</label>
              <p className="mb-2 text-xs text-slate-500">
                研究目的・データの取り扱い（保存期間/公開範囲）・回答の任意性と中断の自由を説明する文章です。
                回答者には回答開始前に表示され、同意した人だけが回答できます。
              </p>
              <div className="mb-2 inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
                <button
                  type="button"
                  onClick={() => setConsentEnabled(true)}
                  className={`px-4 py-1.5 ${consentEnabled ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  あり
                </button>
                <button
                  type="button"
                  onClick={() => setConsentEnabled(false)}
                  className={`px-4 py-1.5 ${!consentEnabled ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  なし
                </button>
              </div>
              {consentEnabled ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">文例を最初から入れてあります。そのまま使っても、自由に書き換えても構いません。</p>
                  <textarea
                    id="field-consent"
                    className={inputClass + (fieldErrors.consent ? ' border-red-400' : '')}
                    rows={6}
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                  />
                  {fieldErrors.consent && <p className="text-xs text-red-600">{fieldErrors.consent}</p>}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  回答者への説明文は表示しません。回答画面では汎用の説明文（学術目的・任意性など）が表示されます。
                </p>
              )}
            </div>
          </section>
        )}

        {/* ステップ2：配信設定 */}
        {step === 2 && (
          <section className="rounded-xl bg-white border-t-8 border-t-sky-500 border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700">配信設定</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対象年齢（任意）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} className={inputClass} placeholder="下限"
                    value={targetConditions.ageMin ?? ''}
                    onChange={(e) => setTargetConditions((c) => ({ ...c, ageMin: e.target.value === '' ? null : Number(e.target.value) }))}
                  />
                  <span className="text-sm text-slate-400">〜</span>
                  <input
                    type="number" min={0} className={inputClass} placeholder="上限"
                    value={targetConditions.ageMax ?? ''}
                    onChange={(e) => setTargetConditions((c) => ({ ...c, ageMax: e.target.value === '' ? null : Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対象の性別（任意）</label>
                <input
                  className={inputClass}
                  placeholder="カンマ区切り（例：男性,女性）。空欄＝制限なし"
                  value={(targetConditions.genders ?? []).join(',')}
                  onChange={(e) => setTargetConditions((c) => ({ ...c, genders: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対象の職業（任意）</label>
                <input
                  className={inputClass}
                  placeholder="カンマ区切り（例：大学生,大学院生）。空欄＝制限なし"
                  value={(targetConditions.occupations ?? []).join(',')}
                  onChange={(e) => setTargetConditions((c) => ({ ...c, occupations: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }))}
                />
                <p className="mt-1 text-xs text-slate-400">条件を設定すると、該当する属性を公開している回答者にのみ配信されます。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">まじめな回答者に限定する（任意）</label>
                <select
                  className={inputClass}
                  value={minTrustScore ?? ''}
                  onChange={(e) => setMinTrustScore(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">制限なし（だれでも回答できます）</option>
                  <option value={50}>ふつう以上の評価の人だけ</option>
                  <option value={70}>評価が高めの人だけ</option>
                  <option value={90}>かなり評価が高い人だけ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">回答データの保持期間（任意）</label>
                <select
                  className={inputClass}
                  value={retentionMonths ?? ''}
                  onChange={(e) => setRetentionMonths(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">無期限</option>
                  <option value={3}>3ヶ月</option>
                  <option value={6}>6ヶ月</option>
                  <option value={12}>1年</option>
                  <option value={24}>2年</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">期間を過ぎた回答データは自動削除されます（個人情報保護法/GDPR対応）。</p>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              ◀ 戻る
            </button>
            <button
              type="button"
              onClick={goNextFromStep2}
              className="btn-3d btn-3d-primary px-6 py-2 text-sm cursor-pointer"
            >
              次へ：設問の作成 ▶
            </button>
          </div>
        )}

        {/* ステップ3：設問作成 */}
        {step === 3 && sections.map((section, si) => (
          <div key={si} className="space-y-4">
            {(sections.length > 1 || section.title || section.description) && (
              <section className="rounded-xl bg-brand-50 border border-brand-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-700">
                    セクション {si + 1} / {sections.length}
                  </span>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(si)} className="text-xs text-red-600 hover:underline cursor-pointer">
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
                const pairKey = q.signal_meta?.pairKey;
                const pairBorder = pairKey ? `border-l-4 ${pairKeyBorderColor(pairKey)}` : '';
                return (
                  <section
                    key={q.key}
                    id={`question-${q.key}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOnQuestion(q.key)}
                    onDragEnd={() => setDragKey(null)}
                    className={`rounded-xl bg-white border p-5 shadow-sm space-y-3 ${pairBorder} ${dragKey === q.key ? 'opacity-50' : ''} ${showValidation && hasError ? 'border-red-400' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          draggable
                          onDragStart={() => setDragKey(q.key)}
                          className="cursor-grab select-none text-slate-500"
                          title="ドラッグで並べ替え"
                        >
                          ⠿ 設問 {globalIndex + 1}
                        </span>
                        {showValidation && warns.length > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${hasError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                            title={warns.map((w) => w.message).join(' / ')}
                          >
                            {hasError ? '⚠ 要修正' : '⚠ 注意'} {warns.length}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        {sections.length > 1 && (
                          <select
                            className="rounded border border-slate-300 px-1 py-1"
                            value={q.section_index}
                            onChange={(e) => updateQuestion(q.key, { section_index: Number(e.target.value) })}
                          >
                            {sections.map((_, idx) => (
                              <option key={idx} value={idx}>S{idx + 1}</option>
                            ))}
                          </select>
                        )}
                        <button type="button" onClick={() => duplicateQuestion(q.key)} className="rounded px-2 py-1 hover:bg-slate-100 cursor-pointer">複製</button>
                        <button type="button" onClick={() => removeQuestion(q.key)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50 cursor-pointer">削除</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <QuestionTypePicker value={q.type} onChange={(type) => changeType(q.key, type)} />
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

                    {/* 品質シグナルの役割 */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <label className="text-slate-500 whitespace-nowrap">役割:</label>
                        <select
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-slate-50"
                          value={q.signal_meta?.role ?? 'standard'}
                          onChange={(e) => {
                            const role = e.target.value as EvaluationRole;
                            updateQuestion(q.key, {
                              signal_meta: role === 'standard'
                                ? null
                                : { ...(q.signal_meta ?? {}), role },
                            });
                          }}
                        >
                          {(Object.entries(ROLE_LABELS) as [EvaluationRole, string][]).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      {/* 一貫性ペアのIDと連動バッジ */}
                      {(q.signal_meta?.role === 'consistency_anchor' || q.signal_meta?.role === 'consistency_check') && (
                        <div className="flex items-center gap-2 text-xs">
                          <label className="text-slate-500 whitespace-nowrap">ペアID:</label>
                          <input
                            className="rounded border border-slate-300 px-2 py-1 text-xs w-32"
                            placeholder="例: sleep_q1"
                            value={q.signal_meta?.pairKey ?? ''}
                            onChange={(e) => {
                              const base: SignalMeta = q.signal_meta ?? { role: 'consistency_anchor' };
                              updateQuestion(q.key, {
                                signal_meta: { ...base, pairKey: e.target.value || undefined },
                              });
                            }}
                          />
                        </div>
                      )}
                      {pairKey && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                          ↔ ペア: {pairKey}
                        </span>
                      )}
                    </div>

                    {needsOptions(q.type) && (
                      <div className="space-y-2 pl-1">
                        {q.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-5">{oi + 1}.</span>
                            <input
                              className={inputClass}
                              placeholder={`選択肢 ${oi + 1}`}
                              value={o}
                              data-opt={`${q.key}:${oi}`}
                              onChange={(e) => updateOption(q.key, oi, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                  e.preventDefault();
                                  const nextIndex = q.options.length;
                                  addOption(q.key);
                                  setTimeout(() => {
                                    document.querySelector<HTMLInputElement>(`[data-opt="${q.key}:${nextIndex}"]`)?.focus();
                                  }, 0);
                                }
                              }}
                            />
                            {q.options.length > 2 && (
                              <button type="button" onClick={() => removeOption(q.key, oi)} className="text-red-500 text-sm px-1 cursor-pointer">×</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addOption(q.key)} className="text-sm text-brand-600 hover:underline cursor-pointer">
                          ＋ 選択肢を追加
                        </button>
                      </div>
                    )}

                    {q.type === 'scale' && (
                      <div className="space-y-3 pl-1">
                        <div className="flex items-center gap-2 text-sm">
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={q.config.min ?? 1}
                            onChange={(e) => updateConfig(q.key, { min: Number(e.target.value) })}
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                          </select>
                          <span>〜</span>
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={q.config.max ?? 5}
                            onChange={(e) => updateConfig(q.key, { max: Number(e.target.value) })}
                          >
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputClass} placeholder="最小値のラベル（任意）" value={q.config.minLabel ?? ''} onChange={(e) => updateConfig(q.key, { minLabel: e.target.value })} />
                          <input className={inputClass} placeholder="最大値のラベル（任意）" value={q.config.maxLabel ?? ''} onChange={(e) => updateConfig(q.key, { maxLabel: e.target.value })} />
                        </div>
                      </div>
                    )}

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
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={!!q.config.multiple} onChange={(e) => updateConfig(q.key, { multiple: e.target.checked })} />
                            各行で複数選択を許可（チェックボックスグリッド）
                          </label>
                        </div>
                      </div>
                    )}

                    {q.type === 'attention' && (
                      <div className="space-y-2 rounded-lg border border-dashed border-red-300 bg-red-50/50 p-3 text-sm">
                        <p className="text-xs text-red-700">
                          回答者がちゃんと設問を読んでいるか確認する「読み飛ばしチェック」設問です。指定した正解以外を選ぶとポイントがもらえなくなります。
                        </p>
                        <label className="flex items-center gap-2 text-slate-700">
                          正解の選択肢：
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1"
                            value={q.config.correctOptionText ?? ''}
                            onChange={(e) => updateConfig(q.key, { correctOptionText: e.target.value })}
                          >
                            <option value="">（選択してください）</option>
                            {q.options.map((o) => o.trim()).filter(Boolean).map((o, i) => (
                              <option key={i} value={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    {q.type === 'paragraph' && <p className="text-xs text-slate-500 pl-1">回答者は長文で回答します。</p>}
                    {q.type === 'date' && <p className="text-xs text-slate-500 pl-1">回答者は日付を選択します。</p>}

                    <ConditionEditor
                      question={q}
                      candidates={orderedQuestions.slice(0, orderedQuestions.findIndex((x) => x.key === q.key))}
                      onChange={(condition) => updateQuestion(q.key, { condition })}
                    />

                    <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
                      <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.key, { required: e.target.checked })} />
                      必須
                    </label>

                    {showValidation && warns.length > 0 && (
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

            <div onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnSection(si)} className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addQuestion(si)}
                  className="flex-1 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-600 cursor-pointer"
                >
                  ＋ 設問を追加
                </button>
              </div>
            </div>
          </div>
        ))}


        {/* ポイントコストの目安 */}
        {step === 3 && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-slate-700">
            <p className="font-bold text-brand-700">
              1回答あたり 平均 {costPerAnswer}pt
              <span className="ml-1 font-normal text-slate-500">（回答品質により 0〜{maxCostPerAnswer}pt）</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ポイントは公開時ではなく、回答が届くたびにその回答の品質に応じて消費されます。
              必要回答数 {Number(requiredCount) || 0} 件がすべて平均品質なら合計 約{costPerAnswer * (Number(requiredCount) || 0)}pt の消費見込みです
              （公開には最低 {costPerAnswer}pt の残高が必要）。
            </p>
          </div>
        )}

        {step === 3 && fieldErrors.general && <p className="text-sm text-red-600">{fieldErrors.general}</p>}

        {step === 3 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              ◀ 戻る
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit('draft')}
              className="rounded-md bg-slate-200 px-5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50 cursor-pointer"
            >
              下書き保存
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit('open')}
              className="btn-3d btn-3d-primary px-5 py-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {survey ? '変更を保存して公開する' : 'このアンケートを公開する'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md px-5 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>

      {/* 右ペイン：プレビュー / 分岐フロー（ステップ3のみ） */}
      {step === 3 && (
        <aside className={`mt-6 lg:mt-0 lg:sticky lg:top-[72px] lg:self-start ${showRight ? '' : 'lg:hidden'}`}>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setRightTab('preview')}
                  className={`px-3 py-1 ${rightTab === 'preview' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
                >
                  プレビュー
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('flow')}
                  className={`px-3 py-1 ${rightTab === 'flow' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
                >
                  分岐フロー
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowRight(false)}
                className="hidden lg:block text-xs text-slate-400 hover:text-slate-700 rounded px-2 py-1 cursor-pointer"
              >
                ✕
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

      {showTemplates && (
        <QuestionTemplates
          onInsert={insertSeeds}
          onClose={() => setShowTemplates(false)}
          currentQuestions={currentSeeds}
        />
      )}

      {showGeneratorModal && (
        <SurveyGeneratorModal
          onClose={() => setShowGeneratorModal(false)}
          onGenerated={handleGenerated}
          defaultTheme={title}
          defaultPurpose={description}
          defaultTargetAudience={(targetConditions.occupations ?? []).join('、')}
        />
      )}

      {publishIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-red-700">⚠ 公開前に修正が必要です</h2>
            <p className="mb-3 text-xs text-slate-500">次の設問にエラーがあります。修正してから公開してください。</p>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {publishIssues.map((it) => (
                <li
                  key={it.index}
                  className="rounded-md border border-red-200 bg-red-50 p-2 text-sm cursor-pointer hover:bg-red-100"
                  onClick={() => {
                    setPublishIssues(null);
                    setTimeout(() => {
                      document.getElementById(`question-${it.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                  }}
                >
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <span className="text-brand-600 text-xs">↓ジャンプ</span>
                    設問 {it.index + 1}：{it.text.trim() || '（無題）'}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                    {it.warnings.filter((w) => w.level === 'error').map((w, wi) => (
                      <li key={wi}>{w.message}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const firstKey = publishIssues[0]?.key;
                  setPublishIssues(null);
                  setTimeout(() => {
                    document.getElementById(`question-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }}
                className="btn-3d btn-3d-primary px-4 py-2 text-sm cursor-pointer"
              >
                最初のエラーへ移動
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionEditor({
  question,
  candidates,
  onChange,
}: {
  question: EditorQuestion;
  candidates: EditorQuestion[];
  onChange: (condition: { sourceKey: string; optionTexts: string[] } | null) => void;
}) {
  const sources = candidates.filter(
    (c) => canBeConditionSource(c.type) && conditionSourceValues(c).length > 0
  );
  const cond = question.condition;
  const enabled = !!cond;
  if (sources.length === 0) return null;
  const source = cond ? sources.find((s) => s.key === cond.sourceKey) ?? null : null;
  const sourceOptions = source ? conditionSourceValues(source) : [];
  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              const first = sources[0];
              const opts = conditionSourceValues(first);
              onChange({ sourceKey: first.key, optionTexts: opts.length > 0 ? [opts[0]] : [] });
            } else {
              onChange(null);
            }
          }}
        />
        条件付きで表示する（特定の回答をした人だけに見せる）
      </label>
      {enabled && cond && (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-slate-300 px-2 py-1"
              value={cond.sourceKey}
              onChange={(e) => {
                const next = sources.find((s) => s.key === e.target.value)!;
                const opts = conditionSourceValues(next);
                onChange({ sourceKey: next.key, optionTexts: opts.length > 0 ? [opts[0]] : [] });
              }}
            >
              {sources.map((s, i) => (
                <option key={s.key} value={s.key}>{`設問「${s.text.trim() || `（無題 ${i + 1}）`}」`}</option>
              ))}
            </select>
            <span>で以下のいずれかを選んだ人だけに表示：</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-1">
            {sourceOptions.map((o, i) => {
              const checked = cond.optionTexts.includes(o);
              return (
                <label key={i} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...cond.optionTexts, o]
                        : cond.optionTexts.filter((t) => t !== o);
                      if (next.length === 0) return;
                      onChange({ sourceKey: cond.sourceKey, optionTexts: next });
                    }}
                  />
                  {source ? conditionSourceValueLabel(source, o, sourceOptions) : o}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GridListEditor({
  label, items, onChange, onAdd, onRemove,
}: {
  label: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-600">{label}</p>
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
      <button type="button" onClick={onAdd} className="text-sm text-brand-600 hover:underline cursor-pointer">
        ＋ {label}を追加
      </button>
    </div>
  );
}
