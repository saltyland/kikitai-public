'use client';

import { useState, useTransition } from 'react';
import { deleteSurveyAction } from '@/app/actions/survey';
import ConfirmDialog from './ui/ConfirmDialog';

/**
 * アンケート削除ボタン。確認モーダルを表示してから削除する（誤削除防止）。
 * 削除は回答データも含めて元に戻せないため必ず確認を挟む。
 */
export default function DeleteSurveyButton({
  surveyId,
  title,
}: {
  surveyId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    const formData = new FormData();
    formData.set('surveyId', surveyId);
    startTransition(async () => {
      await deleteSurveyAction(formData);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-1 text-red-600 hover:bg-red-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
      >
        削除
      </button>
      <ConfirmDialog
        open={open}
        danger
        title="アンケートを削除します"
        message={
          <>
            「<strong>{title}</strong>」と、寄せられた全ての回答データが削除されます。
            <br />
            この操作は取り消せません。
          </>
        }
        confirmLabel="削除する"
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
