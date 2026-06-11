'use client';

import { useActionState } from 'react';
import {
  updateProfileAction,
  changePlanAction,
  deleteAccountAction,
  type ProfileActionState,
} from '@/app/actions/profile';
import type { Profile } from '@/lib/types/database';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

const initial: ProfileActionState = { error: null };

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <div className="space-y-8">
      <PlanManager plan={profile.plan} />
      <form action={action} className="card-3d p-6 space-y-4">
        <div>
          <label className={labelClass} htmlFor="nickname">ニックネーム <span className="text-red-400">*</span></label>
          <input id="nickname" name="nickname" required defaultValue={profile.nickname} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="affiliation">所属機関</label>
          <input id="affiliation" name="affiliation" defaultValue={profile.affiliation ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="field">研究分野</label>
          <input id="field" name="field" defaultValue={profile.field ?? ''} className={inputClass} />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-600">保存しました。</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-3d btn-3d-primary px-5 py-2 text-sm"
        >
          {pending ? '保存中…' : '保存する'}
        </button>
      </form>

      <DeleteAccountSection />
    </div>
  );
}

/** 退会セクション。サーバー側のエラー（設定不足など）を表示できるようにする。 */
function DeleteAccountSection() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);

  return (
    <form action={action} className="card-3d border border-red-200 p-6">
      <h2 className="text-sm font-bold text-red-700">退会する</h2>
      <p className="mt-1 mb-3 text-sm text-zinc-500">
        退会するとプロフィールと作成したアンケートが削除されます。この操作は取り消せません。
      </p>
      {state.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-3d btn-3d-ghost border border-red-300 px-5 py-2 text-sm text-red-500 hover:text-red-600"
      >
        {pending ? '退会処理中…' : '退会する'}
      </button>
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
                isPro ? 'bg-amber-400 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isPro
              ? 'Proプラン加入中です。結果画面で「統計解析モード」が利用できます。'
              : 'Proプランに加入すると、結果画面で平均・中央値・標準偏差などの統計解析モードが使えます。'}
          </p>
        </div>
      </div>

      <input type="hidden" name="plan" value={isPro ? 'free' : 'pro'} />
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">プランを変更しました。</p>}
      <button
        type="submit"
        disabled={pending}
        className={`btn-3d mt-4 px-5 py-2 text-sm ${
          isPro ? 'btn-3d-secondary' : 'btn-3d-primary'
        }`}
      >
        {pending ? '変更中…' : isPro ? 'Proプランを解約する' : 'Proプランに加入する'}
      </button>
    </form>
  );
}
