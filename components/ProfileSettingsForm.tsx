'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  updateProfileAction,
  changePlanAction,
  type ProfileActionState,
} from '@/app/actions/profile';
import Avatar from '@/components/Avatar';
import NotificationSettingsTab from '@/components/NotificationSettingsTab';
import type { NotificationSettings, PrivateField, Profile, SnsLinks } from '@/lib/types/database';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
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
            className="accent-brand-500"
          />
          非公開にする（+10pt）
        </label>
      </div>
      <input id={name} name={name} type={type} defaultValue={defaultValue} className={inputClass} />
    </div>
  );
}

/** SNSリンクの入力セクション */
function SnsLinksSection({ sns }: { sns: SnsLinks }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">SNS・リンク（公開プロフィールに表示されます）</p>
      <div>
        <label className={labelClass} htmlFor="sns_twitter">Twitter / X の URL</label>
        <input
          id="sns_twitter"
          name="sns_twitter"
          type="url"
          placeholder="https://x.com/yourname"
          defaultValue={sns.twitter ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="sns_instagram">Instagram の URL</label>
        <input
          id="sns_instagram"
          name="sns_instagram"
          type="url"
          placeholder="https://instagram.com/yourname"
          defaultValue={sns.instagram ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="sns_github">GitHub の URL</label>
        <input
          id="sns_github"
          name="sns_github"
          type="url"
          placeholder="https://github.com/yourname"
          defaultValue={sns.github ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="sns_website">ウェブサイト・研究室ページ</label>
        <input
          id="sns_website"
          name="sns_website"
          type="url"
          placeholder="https://example.com"
          defaultValue={sns.website ?? ''}
          className={inputClass}
        />
      </div>
    </div>
  );
}

/** /profile/settings のメインコンテンツ：プロフィール編集フォーム＋通知設定＋プラン管理 */
export default function ProfileSettingsForm({
  profile,
  settings,
}: {
  profile: Profile;
  settings: NotificationSettings;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  const isPrivate = (f: PrivateField) => profile.private_fields.includes(f);

  return (
    <div className="space-y-8">
      <form action={action} className="card-3d p-6 space-y-4">
        <AvatarPicker nickname={profile.nickname} currentUrl={profile.avatar_url} />

        <div>
          <label className={labelClass} htmlFor="nickname">ニックネーム <span className="text-red-400">*</span></label>
          <input id="nickname" name="nickname" required defaultValue={profile.nickname} className={inputClass} />
        </div>

        <div className="rounded-lg bg-brand-50/70 px-3 py-2 text-xs text-slate-600">
          属性を<strong className="text-brand-700">非公開</strong>にすると、その項目はマッチングに使われなくなりますが、
          プロフィール充実ボーナス（1項目あたり +10pt・上限50pt）がもらえます。
        </div>

        <AttrRow name="affiliation" label="所属機関" defaultValue={profile.affiliation ?? ''} defaultPrivate={isPrivate('affiliation')} />
        <AttrRow name="field" label="研究分野" defaultValue={profile.field ?? ''} defaultPrivate={isPrivate('field')} />
        <AttrRow name="age" label="年齢" type="number" defaultValue={profile.age != null ? String(profile.age) : ''} defaultPrivate={isPrivate('age')} />
        <AttrRow name="gender" label="性別" defaultValue={profile.gender ?? ''} defaultPrivate={isPrivate('gender')} />
        <AttrRow name="occupation" label="職業" defaultValue={profile.occupation ?? ''} defaultPrivate={isPrivate('occupation')} />
        <AttrRow name="grade" label="学年" defaultValue={profile.grade ?? ''} defaultPrivate={isPrivate('grade')} />
        <AttrRow name="major" label="専攻" defaultValue={profile.major ?? ''} defaultPrivate={isPrivate('major')} />

        <SnsLinksSection sns={profile.sns_links ?? {}} />

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p role="status" className="text-sm text-green-600">保存しました。</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-3d btn-3d-primary px-5 py-2 text-sm"
        >
          {pending ? '保存中…' : '保存する'}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-800">通知設定</h2>
        <NotificationSettingsTab settings={settings} />
      </section>

      <PlanManager plan={profile.plan} />
    </div>
  );
}

/** アバター画像の選択＋プレビュー。選んだファイルは name="avatar" でフォーム送信される。 */
function AvatarPicker({ nickname, currentUrl }: { nickname: string; currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 選択した画像のプレビューURLは使い終わったら解放する
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={nickname} src={preview ?? currentUrl} className="h-16 w-16 text-2xl" />
      <div>
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-3d btn-3d-secondary px-4 py-1.5 text-sm"
        >
          画像を変更
        </button>
        <p className="mt-1 text-xs text-slate-400">JPG / PNG・5MBまで。保存すると反映されます。</p>
      </div>
    </div>
  );
}

/** 料金プラン管理（Pro加入／解約）。Proのみ統計解析モードが使える。 */
function PlanManager({ plan }: { plan: Profile['plan'] }) {
  const [state, action, pending] = useActionState(changePlanAction, initial);
  const isPro = plan === 'pro';

  return (
    <form
      action={action}
      className={`card-3d p-6 ${isPro ? 'border-amber-300/80' : ''}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            料金プラン
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isPro ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
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
        className={`btn-3d mt-4 px-5 py-2 text-sm ${
          isPro ? 'btn-3d-secondary' : 'btn-3d-primary'
        }`}
      >
        {pending ? '変更中…' : isPro ? 'Proプランを解約する' : 'Proプランに加入する'}
      </button>
    </form>
  );
}
