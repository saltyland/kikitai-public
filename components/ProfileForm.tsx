'use client';

import { useActionState } from 'react';
import { updateProfileAction, deleteAccountAction, type ProfileActionState } from '@/app/actions/profile';
import type { Profile } from '@/lib/types/database';

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-zinc-700 mb-1';

const initial: ProfileActionState = { error: null };

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <div className="space-y-8">
      <form action={action} className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
        <div>
          <label className={labelClass} htmlFor="nickname">ニックネーム <span className="text-red-500">*</span></label>
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
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {pending ? '保存中…' : '保存する'}
        </button>
      </form>

      <form
        action={deleteAccountAction}
        className="rounded-xl bg-white border border-red-200 p-6 shadow-sm"
      >
        <h2 className="text-sm font-bold text-red-700">退会する</h2>
        <p className="mt-1 mb-3 text-sm text-zinc-500">
          退会するとプロフィールと作成したアンケートが削除されます。この操作は取り消せません。
        </p>
        <button
          type="submit"
          className="rounded-md border border-red-300 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
        >
          退会する
        </button>
      </form>
    </div>
  );
}
