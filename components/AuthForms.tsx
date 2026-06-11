'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, registerAction, type ActionState } from '@/app/actions/auth';

const initial: ActionState = { error: null };

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">パスワード</label>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-3d btn-3d-primary w-full py-2 text-sm"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
      <p className="text-center text-sm text-slate-600">
        アカウントをお持ちでない方は{' '}
        <Link href="/register" className="text-brand-600 hover:underline">新規登録</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="email">メールアドレス <span className="text-red-500">*</span></label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">パスワード（8文字以上・英小文字と数字を含む）<span className="text-red-500">*</span></label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          title="8文字以上で、英小文字（a-z）と数字（0-9）をそれぞれ1文字以上含めてください"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="nickname">ニックネーム <span className="text-red-500">*</span></label>
        <input id="nickname" name="nickname" type="text" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="affiliation">所属機関（任意）</label>
        <input id="affiliation" name="affiliation" type="text" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="field">研究分野（任意）</label>
        <input id="field" name="field" type="text" className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-3d btn-3d-primary w-full py-2 text-sm"
      >
        {pending ? '登録中…' : '登録する'}
      </button>
      <p className="text-center text-sm text-slate-600">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-brand-600 hover:underline">ログイン</Link>
      </p>
    </form>
  );
}
