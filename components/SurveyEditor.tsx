'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicSurveyEditor from '@/components/PublicSurveyEditor';
import UnlistedSurveyEditor from '@/components/UnlistedSurveyEditor';
import type { SurveyWithQuestions } from '@/lib/types/database';

/**
 * アンケートエディタのエントリポイント。
 * - 新規作成時：公開モード選択モーダルを表示し、選択内容に応じてエディタを振り分ける。
 * - 編集時：既存アンケートの visibility に応じて自動的に正しいエディタを表示する。
 *
 * 通常公開  → PublicSurveyEditor（AI品質評価・ポイント計算・配信設定あり）
 * 限定公開  → UnlistedSurveyEditor（シンプルなアンケート作成ツール）
 */

type VisibilityChoice = 'public' | 'unlisted' | null;

/** チェックリスト1行分。アイコンの色は呼び出し側の text-* で決める（currentColor） */
function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
        <path
          d="M6 10.3 8.7 13 14 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/** 通常公開のイラスト：中央のアンケート用紙から、周囲の複数の人へ波紋と矢印が広がる構図 */
function PublicModeIllustration() {
  return (
    <svg viewBox="0 0 280 170" className="h-32 w-full sm:h-36" aria-hidden="true" focusable="false">
      <defs>
        <filter id="pub-mode-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#165653" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 波紋 */}
      <circle cx="140" cy="87" r="74" fill="none" stroke="var(--color-brand-200)" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
      <circle cx="140" cy="87" r="52" fill="none" stroke="var(--color-brand-300)" strokeWidth="2" opacity="0.7" />

      {/* 中心から人へ伸びる矢印線 */}
      <line x1="140" y1="87" x2="54" y2="38" stroke="var(--color-brand-300)" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="87" x2="226" y2="38" stroke="var(--color-brand-300)" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="87" x2="50" y2="140" stroke="var(--color-brand-300)" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="87" x2="230" y2="140" stroke="var(--color-brand-300)" strokeWidth="2" strokeLinecap="round" />

      {/* 周囲の回答者アバター（人型シルエット） */}
      <g>
        <circle cx="54" cy="38" r="15" fill="var(--color-brand-100)" stroke="var(--color-brand-400)" strokeWidth="2" />
        <circle cx="54" cy="33" r="4.5" fill="var(--color-brand-600)" />
        <path d="M46 46c1.6-5.4 5.2-8.5 8-8.5s6.4 3.1 8 8.5" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="226" cy="38" r="15" fill="var(--color-brand-100)" stroke="var(--color-brand-400)" strokeWidth="2" />
        <circle cx="226" cy="33" r="4.5" fill="var(--color-brand-500)" />
        <path d="M218 46c1.6-5.4 5.2-8.5 8-8.5s6.4 3.1 8 8.5" fill="none" stroke="var(--color-brand-500)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="50" cy="140" r="15" fill="var(--color-brand-100)" stroke="var(--color-brand-400)" strokeWidth="2" />
        <circle cx="50" cy="135" r="4.5" fill="var(--color-brand-500)" />
        <path d="M42 148c1.6-5.4 5.2-8.5 8-8.5s6.4 3.1 8 8.5" fill="none" stroke="var(--color-brand-500)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="230" cy="140" r="15" fill="var(--color-brand-100)" stroke="var(--color-brand-400)" strokeWidth="2" />
        <circle cx="230" cy="135" r="4.5" fill="var(--color-brand-600)" />
        <path d="M222 148c1.6-5.4 5.2-8.5 8-8.5s6.4 3.1 8 8.5" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 中央のアンケート用紙 */}
      <g filter="url(#pub-mode-shadow)">
        <rect x="109" y="53" width="62" height="74" rx="9" fill="white" stroke="var(--color-brand-400)" strokeWidth="2.5" />
      </g>
      <rect x="121" y="68" width="38" height="5" rx="2.5" fill="var(--color-brand-500)" />
      <rect x="121" y="80" width="32" height="4" rx="2" fill="var(--color-brand-200)" />
      <rect x="121" y="90" width="36" height="4" rx="2" fill="var(--color-brand-200)" />
      <rect x="121" y="100" width="24" height="4" rx="2" fill="var(--color-brand-200)" />
      <rect x="121" y="111" width="11" height="11" rx="3" fill="var(--color-brand-500)" />
      <path d="M123.5 116.5 125.8 119 130.5 113.8" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 限定公開のイラスト：リンクでつながった、閉じた小さなグループだけに届く構図 */
function UnlistedModeIllustration() {
  return (
    <svg viewBox="0 0 280 170" className="h-32 w-full sm:h-36" aria-hidden="true" focusable="false">
      <defs>
        <filter id="unl-mode-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#334155" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* 閉じた小グループの囲み */}
      <ellipse cx="205" cy="83" rx="50" ry="42" fill="var(--color-slate-200)" opacity="0.4" />
      <ellipse cx="205" cy="83" rx="50" ry="42" fill="none" stroke="var(--color-slate-300)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />

      {/* アンケート用紙 → リンクをつなぐ点線 */}
      <line x1="106" y1="80" x2="176" y2="80" stroke="var(--color-slate-300)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      {/* 鎖（リンク共有）モチーフ */}
      <g transform="translate(141,80) rotate(32)">
        <rect x="-15" y="-6.5" width="17" height="13" rx="6.5" fill="none" stroke="var(--color-slate-500)" strokeWidth="2.5" />
        <rect x="-2" y="-6.5" width="17" height="13" rx="6.5" fill="none" stroke="var(--color-slate-500)" strokeWidth="2.5" />
      </g>

      {/* アンケート用紙 */}
      <g filter="url(#unl-mode-shadow)">
        <rect x="46" y="49" width="60" height="72" rx="9" fill="white" stroke="var(--color-slate-400)" strokeWidth="2.5" />
      </g>
      <rect x="58" y="63" width="36" height="5" rx="2.5" fill="var(--color-slate-500)" />
      <rect x="58" y="75" width="30" height="4" rx="2" fill="var(--color-slate-200)" />
      <rect x="58" y="85" width="34" height="4" rx="2" fill="var(--color-slate-200)" />

      {/* 鍵バッジ（非公開性） */}
      <circle cx="106" cy="118" r="17" fill="white" stroke="var(--color-slate-400)" strokeWidth="2" filter="url(#unl-mode-shadow)" />
      <g transform="translate(106,118)">
        <rect x="-7.5" y="-2" width="15" height="12" rx="2.5" fill="var(--color-slate-600)" />
        <path d="M-4.5 -2v-4.5a4.5 4.5 0 0 1 9 0v4.5" fill="none" stroke="var(--color-slate-600)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="4" r="1.6" fill="white" />
      </g>

      {/* 少人数のアバター（2〜3人だけの小グループ） */}
      <g>
        <circle cx="190" cy="70" r="14" fill="var(--color-slate-100)" stroke="var(--color-slate-400)" strokeWidth="2" />
        <circle cx="190" cy="65.5" r="4.2" fill="var(--color-slate-600)" />
        <path d="M182.7 78c1.5-5 4.9-8 7.3-8s5.8 3 7.3 8" fill="none" stroke="var(--color-slate-600)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="222" cy="76" r="14" fill="var(--color-slate-100)" stroke="var(--color-slate-400)" strokeWidth="2" />
        <circle cx="222" cy="71.5" r="4.2" fill="var(--color-slate-500)" />
        <path d="M214.7 84c1.5-5 4.9-8 7.3-8s5.8 3 7.3 8" fill="none" stroke="var(--color-slate-500)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="206" cy="103" r="14" fill="var(--color-slate-100)" stroke="var(--color-slate-400)" strokeWidth="2" />
        <circle cx="206" cy="98.5" r="4.2" fill="var(--color-slate-600)" />
        <path d="M198.7 111c1.5-5 4.9-8 7.3-8s5.8 3 7.3 8" fill="none" stroke="var(--color-slate-600)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function SurveyEditor({
  survey,
}: {
  survey: SurveyWithQuestions | null;
}) {
  const router = useRouter();

  // 編集時は既存の visibility から確定。新規作成時は null（モーダル表示）。
  const initialChoice: VisibilityChoice = survey
    ? survey.visibility === 'unlisted'
      ? 'unlisted'
      : 'public'
    : null;

  const [choice, setChoice] = useState<VisibilityChoice>(initialChoice);

  if (choice === 'public') {
    return <PublicSurveyEditor survey={survey} />;
  }

  if (choice === 'unlisted') {
    return <UnlistedSurveyEditor survey={survey} />;
  }

  // 新規作成時：公開モード選択モーダル
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-modal-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-10"
      >
        <div className="text-center">
          <h2 id="mode-modal-title" className="text-balance text-2xl font-extrabold text-slate-800 sm:text-3xl">
            公開モードを選んでください
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-balance text-sm text-slate-500">
            アンケートに合う届け方を選びましょう。どちらも同じ作成画面から設問を作れます。
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* 通常公開 */}
          <button
            type="button"
            onClick={() => setChoice('public')}
            className="group relative flex flex-col rounded-2xl border-2 border-brand-300 bg-brand-50 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 focus-visible:ring-offset-2 cursor-pointer sm:p-6"
          >
            <span className="absolute -top-3 left-6 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-white shadow-md">
              おすすめ
            </span>

            <PublicModeIllustration />

            <p className="mt-4 text-xl font-extrabold text-brand-800">通常公開</p>
            <p className="mt-1 text-sm text-slate-600">一覧に載せて、みんなに回答を集めます。</p>

            <ul className="mt-4 space-y-2 text-brand-500">
              <CheckItem>アンケート一覧に掲載され、回答者に見つけてもらえます</CheckItem>
              <CheckItem>AI品質評価で低品質な回答を自動フィルタリング</CheckItem>
              <CheckItem>年齢・性別などで回答者を絞り込めます</CheckItem>
            </ul>

            <div className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700">
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
                <text x="10" y="13.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">pt</text>
              </svg>
              回答が届くたびにポイントを消費
            </div>
          </button>

          {/* 限定公開 */}
          <button
            type="button"
            onClick={() => setChoice('unlisted')}
            className="group flex flex-col rounded-2xl border-2 border-slate-300 bg-slate-50 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 focus-visible:ring-offset-2 cursor-pointer sm:p-6"
          >
            <UnlistedModeIllustration />

            <p className="mt-4 text-xl font-extrabold text-slate-800">限定公開</p>
            <p className="mt-1 text-sm text-slate-600">リンクを知っている人だけに届けます。</p>

            <ul className="mt-4 space-y-2 text-slate-500">
              <CheckItem>アンケート一覧・検索には表示されません</CheckItem>
              <CheckItem>共有したリンクを知っている人だけが回答できます</CheckItem>
              <CheckItem>ゼミ・授業・友人内など、回答者が決まっている調査向き</CheckItem>
            </ul>

            <div className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M12 20.5s-6.8-4.1-8.9-8C1.4 8.9 3.3 6 6.2 6c1.9 0 3.1 1 5.8 3.2C14.7 7 15.9 6 17.8 6c2.9 0 4.8 2.9 3.1 6.5-2.1 3.9-8.9 8-8.9 8Z"
                  fill="currentColor"
                  fillOpacity="0.18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              ポイント消費なし・完全無料
            </div>
          </button>
        </div>

        <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
            <path
              d="M12 3.5 21.5 20h-19L12 3.5Z"
              fill="currentColor"
              fillOpacity="0.15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M12 9.8v4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16.9" r="1.1" fill="currentColor" />
          </svg>
          <p>
            公開モードは<span className="font-bold">作成後に変更できません</span>。
            内容をよく確認してから選んでください。
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mx-auto mt-5 block cursor-pointer text-center text-sm text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded"
        >
          キャンセルしてホームに戻る
        </button>
      </div>
    </div>
  );
}
