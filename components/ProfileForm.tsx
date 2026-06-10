'use client';

import { useState, useActionState } from 'react';
import {
  updateProfileAction,
  changePlanAction,
  deleteAccountAction,
  type ProfileActionState,
} from '@/app/actions/profile';
import type { Profile } from '@/lib/types/database';
import { inputClass, primaryButtonClass } from '@/lib/ui/styles';
import { FormLabel } from '@/components/ui/FormLabel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const initial: ProfileActionState = { error: null };

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <div className="space-y-8">
      <PlanManager plan={profile.plan} />
      <form action={action} className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
        <div>
          <FormLabel htmlFor="nickname" required>ニックネーム</FormLabel>
          <input id="nickname" name="nickname" required defaultValue={profile.nickname} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor="affiliation" optional>所属機関</FormLabel>
          <input id="affiliation" name="affiliation" defaultValue={profile.affiliation ?? ''} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor="field" optional>研究分野</FormLabel>
          <input id="field" name="field" defaultValue={profile.field ?? ''} className={inputClass} />
        </div>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p role="status" className="text-sm text-green-700">保存しました。</p>}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? '保存中…' : '保存する'}
        </button>
      </form>

      <DeleteAccountSection />
    </div>
  );
}

/** 退会セクション。確認モーダルを挟み、サーバー側のエラー（設定不足など）も表示する。 */
function DeleteAccountSection() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  const [open, setOpen] = useState(false);

  return (
    <form action={action} className="rounded-xl bg-white border border-red-200 p-6 shadow-sm">
      <h2 className="text-sm font-bold text-red-700">退会する</h2>
      <p className="mt-1 mb-3 text-sm text-zinc-600">
        退会するとプロフィールと作成したアンケートが削除されます。この操作は取り消せません。
      </p>
      {state.error && <p role="alert" className="mb-3 text-sm text-red-600">{state.error}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="rounded-md border border-red-300 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
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

/** 料金プラン管理（Pro加入／解約）。Proのみ統計解析モードが使える。 */
function PlanManager({ plan }: { plan: Profile['plan'] }) {
  const [state, action, pending] = useActionState(changePlanAction, initial);
  const isPro = plan === 'pro';

  return (
    <form
      action={action}
      className={`rounded-xl border p-6 shadow-sm ${
        isPro ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            料金プラン
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isPro ? 'bg-amber-500 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {isPro
              ? 'Proプラン加入中です。結果画面で「統計解析モード」が利用できます。'
              : 'Proプランに加入すると、結果画面で平均・中央値・標準偏差などの統計解析モードが使えます。'}
          </p>
        </div>
      </div>

      <input type="hidden" name="plan" value={isPro ? 'free' : 'pro'} />
      {state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p role="status" className="mt-3 text-sm text-green-700">プランを変更しました。</p>}
      <button
        type="submit"
        disabled={pending}
        className={`mt-4 rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          isPro
            ? 'bg-zinc-500 hover:bg-zinc-600 focus-visible:ring-zinc-400'
            : 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400'
        }`}
      >
        {pending ? '変更中…' : isPro ? 'Proプランを解約する' : 'Proプランに加入する'}
      </button>
    </form>
  );
}
