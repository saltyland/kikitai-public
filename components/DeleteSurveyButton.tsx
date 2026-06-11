'use client';

import { deleteSurveyAction } from '@/app/actions/survey';

/**
 * アンケート削除ボタン。送信前に確認ダイアログを表示し、誤削除を防ぐ。
 * 削除は回答データも含めて元に戻せないため必ず確認を挟む。
 */
export default function DeleteSurveyButton({
  surveyId,
  title,
}: {
  surveyId: string;
  title: string;
}) {
  return (
    <form
      action={deleteSurveyAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `「${title}」を削除します。\n回答データもすべて削除され、元に戻せません。よろしいですか？`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="surveyId" value={surveyId} />
      <button className="btn-3d btn-3d-ghost px-3 py-1 text-red-500 hover:text-red-600">
        削除
      </button>
    </form>
  );
}
