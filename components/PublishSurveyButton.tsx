'use client';

import { useState, useTransition } from 'react';
import { changeStatusAction } from '@/app/actions/survey';
import ConfirmDialog from './ui/ConfirmDialog';

/**
 * アンケート公開ボタン。公開すると設問の編集ができなくなり、回答ごとにポイントが
 * 消費され始める（不可逆に近い）ため、確認モーダルを挟む。
 */
export default function PublishSurveyButton({ surveyId }: { surveyId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    const formData = new FormData();
    formData.set('surveyId', surveyId);
    formData.set('status', 'open');
    startTransition(async () => {
      await changeStatusAction(formData);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-3d btn-3d-primary px-3 py-1"
      >
        公開する
      </button>
      <ConfirmDialog
        open={open}
        title="このアンケートを公開しますか？"
        message={
          <>
            公開すると、回答が集まり始めます。
            <br />
            公開中は設問を編集できなくなり、回答1件ごとにポイントが消費されます。
          </>
        }
        confirmLabel="公開する"
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
