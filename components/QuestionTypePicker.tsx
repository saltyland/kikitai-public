'use client';

import { useEffect, useRef, useState } from 'react';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import type { QuestionType } from '@/lib/types/database';

/**
 * 設問タイプの選択UI。
 *
 * 高校生が「ラジオボタン」「グリッド」などの固有名詞を見ても直感的に分からない、という
 * 課題に対応する。プルタブ（現在の選択を表示するボタン）を開くと、各タイプの完成イメージ図
 * （ミニプレビュー）がボタンとして並び、見た目で選べるようにしている。
 */

/** タイプごとの「やさしい呼び名」と一言説明。固有名詞は補足にとどめる。 */
const FRIENDLY: Record<QuestionType, { name: string; hint: string }> = {
  single: { name: '1つだけ選ぶ', hint: 'ラジオボタン' },
  multiple: { name: 'いくつでも選ぶ', hint: 'チェックボックス' },
  dropdown: { name: 'リストから選ぶ', hint: 'プルダウン' },
  text: { name: '短く書く', hint: '記述式（短文）' },
  paragraph: { name: '長く書く', hint: '段落（長文）' },
  date: { name: '日付を選ぶ', hint: 'カレンダー' },
  scale: { name: '段階で評価', hint: '5段階など' },
  grid: { name: '表で答える', hint: 'グリッド' },
  attention: { name: '注意チェック', hint: '正解つき確認設問' },
};

/** 各タイプの完成イメージ図（SVGミニプレビュー）。文字なしで形だけ見せる。 */
function TypePreview({ type }: { type: QuestionType }) {
  const line = '#a1a1aa'; // slate-400
  const fill = '#6366f1'; // brand-500
  switch (type) {
    case 'single':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          {[8, 22, 36].map((y, i) => (
            <g key={y}>
              <circle cx="12" cy={y} r="5" fill="none" stroke={i === 0 ? fill : line} strokeWidth="2" />
              {i === 0 && <circle cx="12" cy={y} r="2.4" fill={fill} />}
              <rect x="22" y={y - 2.5} width="34" height="5" rx="2.5" fill={line} opacity="0.5" />
            </g>
          ))}
        </svg>
      );
    case 'multiple':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          {[8, 22, 36].map((y, i) => (
            <g key={y}>
              <rect x="7" y={y - 5} width="10" height="10" rx="2" fill="none" stroke={i < 2 ? fill : line} strokeWidth="2" />
              {i < 2 && <path d={`M9 ${y} l2.5 2.5 l4 -5`} fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
              <rect x="22" y={y - 2.5} width="34" height="5" rx="2.5" fill={line} opacity="0.5" />
            </g>
          ))}
        </svg>
      );
    case 'dropdown':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          <rect x="8" y="8" width="48" height="12" rx="3" fill="none" stroke={fill} strokeWidth="2" />
          <path d="M46 12 l3 3 l3 -3" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          <rect x="8" y="23" width="48" height="6" rx="2" fill={line} opacity="0.4" />
          <rect x="8" y="31" width="48" height="6" rx="2" fill={line} opacity="0.25" />
        </svg>
      );
    case 'text':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          <rect x="8" y="14" width="48" height="13" rx="3" fill="none" stroke={line} strokeWidth="2" />
          <rect x="12" y="19" width="22" height="3" rx="1.5" fill={fill} />
        </svg>
      );
    case 'paragraph':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          <rect x="8" y="6" width="48" height="28" rx="3" fill="none" stroke={line} strokeWidth="2" />
          {[12, 19, 26].map((y) => (
            <rect key={y} x="12" y={y} width={y === 26 ? 28 : 40} height="3" rx="1.5" fill={fill} opacity="0.7" />
          ))}
        </svg>
      );
    case 'date':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          <rect x="16" y="8" width="32" height="26" rx="3" fill="none" stroke={line} strokeWidth="2" />
          <line x1="16" y1="15" x2="48" y2="15" stroke={line} strokeWidth="2" />
          <line x1="24" y1="6" x2="24" y2="11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="6" x2="40" y2="11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          {[22, 30, 38].map((x) => [21, 28].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={fill} />))}
        </svg>
      );
    case 'scale':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          <line x1="10" y1="20" x2="54" y2="20" stroke={line} strokeWidth="2" />
          {[10, 21, 32, 43, 54].map((x, i) => (
            <circle key={x} cx={x} cy="20" r={i === 3 ? 5 : 3.5} fill={i === 3 ? fill : '#fff'} stroke={i === 3 ? fill : line} strokeWidth="2" />
          ))}
        </svg>
      );
    case 'grid':
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          {[10, 22, 34].map((y) =>
            [18, 32, 46].map((x, i) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill={i === 1 ? fill : 'none'} stroke={i === 1 ? fill : line} strokeWidth="2" />
            ))
          )}
          {[10, 22, 34].map((y) => <rect key={y} x="2" y={y - 2} width="9" height="4" rx="2" fill={line} opacity="0.45" />)}
        </svg>
      );
    case 'attention':
      // 単一選択＋正解（チェックマーク）のイメージ
      return (
        <svg viewBox="0 0 64 40" className="h-full w-full">
          {[8, 22, 36].map((y, i) => (
            <g key={y}>
              <circle cx="12" cy={y} r="5" fill="none" stroke={i === 1 ? fill : line} strokeWidth="2" />
              {i === 1 && <circle cx="12" cy={y} r="2.4" fill={fill} />}
              <rect x="22" y={y - 2.5} width="26" height="5" rx="2.5" fill={line} opacity="0.5" />
            </g>
          ))}
          <path d="M52 19 l3.5 3.5 l6 -7" fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function QuestionTypePicker({
  value,
  onChange,
  exclude = [],
}: {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  exclude?: QuestionType[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const types = QuestionTypeRegistry.all().map((d) => d.type).filter((t) => !exclude.includes(t));

  // 外側クリック・Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = FRIENDLY[value];

  return (
    <div ref={ref} className="relative">
      {/* プルタブ（現在の選択） */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-left hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <span className="h-7 w-11 shrink-0 rounded bg-slate-50 ring-1 ring-slate-200">
          <TypePreview type={value} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">{current.name}</span>
          <span className="block truncate text-[11px] text-slate-400">{current.hint}</span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 開いた時：イメージ図ボタンの一覧 */}
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-[min(34rem,90vw)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 px-1 text-xs font-bold text-slate-500">回答のしかたを選ぶ</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {types.map((t) => {
              const f = FRIENDLY[t];
              const active = t === value;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-center transition ${
                    active
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'
                  }`}
                >
                  <span className="h-12 w-full rounded bg-slate-50 ring-1 ring-slate-100">
                    <TypePreview type={t} />
                  </span>
                  <span className="text-xs font-medium text-slate-800">{f.name}</span>
                  <span className="text-[10px] leading-tight text-slate-400">{f.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
