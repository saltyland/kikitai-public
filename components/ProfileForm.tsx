'use client';

import { useActionState } from 'react';
import {
  updateProfileAction,
  changePlanAction,
  deleteAccountAction,
  type ProfileActionState,
} from '@/app/actions/profile';
import type { PointsSummary, PrivateField, Profile } from '@/lib/types/database';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

const initial: ProfileActionState = { error: null };

/** 属性入力＋「非公開にする」チェックの1行 */
function AttrRow({
  name,
  label,
  type = 'text',
  defaultValue,
  defaultPrivate,
}: {
  name: PrivateField;
  label: string;
  type?: string;
  defaultValue: string;
  defaultPrivate: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass} htmlFor={name}>{label}</label>
        <label className="mb-1 flex items-center gap-1 text-xs text-slate-500">
          <input
            type="checkbox"
            name="private_fields"
            value={name}
            defaultChecked={defaultPrivate}
            className="accent-sky-500"
          />
          非公開にする（+10pt）
        </label>
      </div>
      <input id={name} name={name} type={type} defaultValue={defaultValue} className={inputClass} />
    </div>
  );
}

export default function ProfileForm({
  profile,
  points,
}: {
  profile: Profile;
  points: PointsSummary;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  const isPrivate = (f: PrivateField) => profile.private_fields.includes(f);

  return (
    <div className="space-y-8">
      <PointsCard profile={profile} points={points} />
      <PlanManager plan={profile.plan} />

      <form action={action} className="card-3d p-6 space-y-4">
        <div>
          <label className={labelClass} htmlFor="nickname">ニックネーム <span className="text-red-400">*</span></label>
          <input id="nickname" name="nickname" required defaultValue={profile.nickname} className={inputClass} />
        </div>

        <div className="rounded-lg bg-sky-50/70 px-3 py-2 text-xs text-slate-600">
          属性を<strong className="text-sky-700">非公開</strong>にすると、その項目はマッチングに使われなくなりますが、
          プロフィール充実ボーナス（1項目あたり +10pt・上限50pt）がもらえます。
        </div>

        <AttrRow name="affiliation" label="所属機関" defaultValue={profile.affiliation ?? ''} defaultPrivate={isPrivate('affiliation')} />
        <AttrRow name="field" label="研究分野" defaultValue={profile.field ?? ''} defaultPrivate={isPrivate('field')} />
        <AttrRow name="age" label="年齢" type="number" defaultValue={profile.age != null ? String(profile.age) : ''} defaultPrivate={isPrivate('age')} />
        <AttrRow name="gender" label="性別" defaultValue={profile.gender ?? ''} defaultPrivate={isPrivate('gender')} />
        <AttrRow name="occupation" label="職業" defaultValue={profile.occupation ?? ''} defaultPrivate={isPrivate('occupation')} />
        <AttrRow name="grade" label="学年" defaultValue={profile.grade ?? ''} defaultPrivate={isPrivate('grade')} />
        <AttrRow name="major" label="専攻" defaultValue={profile.major ?? ''} defaultPrivate={isPrivate('major')} />

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

/** ポイント残高・信頼スコア・失効予定を表示するカード */
function PointsCard({ profile, points }: { profile: Profile; points: PointsSummary }) {
  return (
    <div className="card-3d p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">保有ポイント</p>
          <p className="text-3xl font-extrabold text-sky-600">
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
              ⚠️ {e.amount}pt が {new Date(e.expires_at).toLocaleDateString('ja-JP')} に失効します（残り14日以内）。
            </p>
          ))}
        </div>
      )}
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
