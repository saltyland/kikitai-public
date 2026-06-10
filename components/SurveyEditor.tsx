'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSurveyAction } from '@/app/actions/survey';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import type {
  QuestionType,
  SectionMeta,
  SurveyInput,
  SurveyStatus,
  SurveyWithQuestions,
  GridConfig,
  ScaleConfig,
} from '@/lib/types/database';

/** 編集中の設問。config はタイプ別の緩い形で保持し、保存時にサービス層が正規化する。 */
interface EditorQuestion {
  key: string;
  type: QuestionType;
  text: string;
  description: string;
  required: boolean;
  options: string[];
  config: Partial<ScaleConfig & GridConfig>;
  section_index: number;
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const TYPE_OPTIONS = QuestionTypeRegistry.all().map((d) => ({
  value: d.type,
  label: d.label,
}));

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
  };
}

function fromSurvey(survey: SurveyWithQuestions | null): {
  title: string;
  description: string;
  requiredCount: number;
  deadline: string;
  sections: SectionMeta[];
  questions: EditorQuestion[];
} {
  if (!survey) {
    return {
      title: '',
      description: '',
      requiredCount: 10,
      deadline: '',
      sections: [{ title: '', description: '' }],
      questions: [newQuestion(0)],
    };
  }
  const sections = survey.sections.length ? survey.sections : [{ title: '', description: '' }];
  return {
    title: survey.title,
    description: survey.description ?? '',
    requiredCount: survey.required_count,
    deadline: survey.deadline ?? '',
    sections,
    questions: survey.questions.map((q) => ({
      key: uid(),
      type: q.type,
      text: q.text,
      description: q.description ?? '',
      required: q.required,
      options: needsOptions(q.type) ? q.options.map((o) => o.text) : [],
      config: (q.config as Partial<ScaleConfig & GridConfig>) ?? {},
      section_index: Math.min(q.section_index, sections.length - 1),
    })),
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
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  const duplicateQuestion = (key: string) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.key === key);
      if (idx < 0) return qs;
      const copy = { ...qs[idx], key: uid(), options: [...qs[idx].options], config: { ...qs[idx].config } };
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
  const updateConfig = (key: string, patch: Partial<ScaleConfig & GridConfig>) => {
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
    // 設問は元の配列順を維持しつつ、セクション順 → 元順 で安定ソートして保存する
    const ordered = [...questions].sort((a, b) => a.section_index - b.section_index);
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
      questions: ordered.map((q) => ({
        type: q.type,
        text: q.text,
        description: q.description || null,
        required: q.required,
        options: q.options,
        config: needsConfig(q.type) ? (q.config as SurveyInput['questions'][number]['config']) : null,
        section_index: q.section_index,
      })),
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
    <div className="space-y-6">
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
              return (
                <section
                  key={q.key}
                  draggable
                  onDragStart={() => setDragKey(q.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOnQuestion(q.key)}
                  className={`rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-3 ${
                    dragKey === q.key ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="cursor-grab select-none text-zinc-400" title="ドラッグで並べ替え">
                      ⠿ 設問 {globalIndex + 1}
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
                    <select
                      className={inputClass + ' sm:col-span-1'}
                      value={q.type}
                      onChange={(e) => changeType(q.key, e.target.value as QuestionType)}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
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
                          <span className="text-xs text-zinc-400 w-5">{oi + 1}.</span>
                          <input
                            className={inputClass}
                            placeholder={`選択肢 ${oi + 1}`}
                            value={o}
                            onChange={(e) => updateOption(q.key, oi, e.target.value)}
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

                  {q.type === 'paragraph' && (
                    <p className="text-xs text-zinc-500 pl-1">回答者は長文で回答します。</p>
                  )}
                  {q.type === 'date' && (
                    <p className="text-xs text-zinc-500 pl-1">回答者は日付を選択します。</p>
                  )}

                  <label className="flex items-center gap-2 pt-1 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                    />
                    必須
                  </label>
                </section>
              );
            })}

          {/* セクション末尾のドロップ／追加エリア */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOnSection(si)}
            className="space-y-2"
          >
            <button
              type="button"
              onClick={() => addQuestion(si)}
              className="w-full rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer"
            >
              ＋ 設問を追加
            </button>
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
  );
}

/** scale/grid のみ config を持つ */
function needsConfig(type: QuestionType) {
  return type === 'scale' || type === 'grid';
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
