'use client';

import { useActionState, useState } from 'react';
import { deleteAccountAction, type ProfileActionState } from '@/app/actions/profile';
import { logoutAction } from '@/app/actions/auth';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PointsSummary, Profile } from '@/lib/types/database';

const initial: ProfileActionState = { error: null };

/** ポイント残高・信頼スコア・失効予定を表示するカード */
export function PointsCard({ profile, points }: { profile: Profile; points: PointsSummary }) {
  return (
    <div className="card-3d p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">保有ポイント</p>
          <p className="text-3xl font-extrabold text-brand-600">
            {points.available}
            <span className="ml-1 text-base font-bold text-slate-400">pt</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">信頼スコア</p>
          <p className="text-2xl font-extrabold text-slate-700">{profile.trust_score}<span className="text-sm text-slate-400"> / 100</span></p>
        </div>
      </div>
      {points.expiringSoon.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {points.expiringSoon.map((e, i) => (
            <p key={i}>
              ⚠ {e.amount}pt が {new Date(e.expires_at).toLocaleDateString('ja-JP')} に失効します（残り14日以内）。
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** ログアウトボタン */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="btn-3d btn-3d-secondary w-full px-5 py-2 text-sm text-slate-600 hover:text-red-600"
      >
        ログアウト
      </button>
    </form>
  );
}

/** 退会セクション。確認モーダルを挟み、サーバー側のエラー（設定不足など）も表示する。 */
export function DeleteAccountSection() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  const [open, setOpen] = useState(false);

  return (
    <form action={action} className="card-3d border border-red-200 p-6">
      <h2 className="text-sm font-bold text-red-700">退会する</h2>
      <p className="mt-1 mb-3 text-sm text-slate-500">
        退会するとプロフィールと作成したアンケートが削除されます。この操作は取り消せません。
      </p>
      {state.error && <p role="alert" className="mb-3 text-sm text-red-600">{state.error}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="btn-3d btn-3d-ghost border border-red-300 px-5 py-2 text-sm text-red-500 hover:text-red-600"
      >
        {pending ? '退会処理中…' : '退会する'}
      </button>
      {/* 確認後、フォームのsubmit（サーバーアクション）を実行する */}
      <ConfirmDialog
        open={open}
        danger
        title="本当に退会しますか？"
        message="プロフィールと、あなたが作成したアンケート・集まった回答がすべて削除されます。この操作は取り消せません。"
        confirmLabel="退会する"
        pending={pending}
        onConfirm={() => {
          setOpen(false);
          // useActionState の form を submit してサーバーアクションを起動する
          (document.getElementById('delete-account-submit') as HTMLButtonElement | null)?.click();
        }}
        onCancel={() => setOpen(false)}
      />
      <button id="delete-account-submit" type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
    </form>
  );
}
