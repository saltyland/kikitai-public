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
 * 通常公開  → PublicSurveyEditor（AI品質判定・ポイント計算・配信設定あり）
 * リンク限定 → UnlistedSurveyEditor（シンプルなアンケート作成ツール）
 */

type VisibilityChoice = 'public' | 'unlisted' | null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-800">公開設定を選んでください</h2>
        <p className="text-sm text-slate-500">作成後に変更することはできません。</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setChoice('public')}
            className="w-full rounded-xl border-2 border-brand-300 bg-brand-50 p-4 text-left hover:bg-brand-100 cursor-pointer transition"
          >
            <p className="font-bold text-brand-800">通常公開</p>
            <p className="mt-1 text-xs text-slate-500">
              アンケート一覧に掲載され、ポイントで回答を集めます。
              AI品質判定・低品質回答フィルタリングが有効になります。
            </p>
          </button>
          <button
            type="button"
            onClick={() => setChoice('unlisted')}
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-4 text-left hover:bg-slate-100 cursor-pointer transition"
          >
            <p className="font-bold text-slate-800">🔒 リンクを知っている人に限定公開</p>
            <p className="mt-1 text-xs text-slate-500">
              一覧には表示されません。共有リンクを送った相手だけが回答できます。
              ポイントの消費・付与なし（無料）。シンプルな設問作成のみ。
            </p>
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          キャンセル（前の画面へ戻る）
        </button>
      </div>
    </div>
  );
}
