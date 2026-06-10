'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, registerAction, type ActionState } from '@/app/actions/auth';
import { inputClass } from '@/lib/ui/styles';
import { FormLabel } from '@/components/ui/FormLabel';
import { Spinner } from '@/components/ui/Spinner';

const initial: ActionState = { error: null };

const submitButtonClass =
  'w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <FormLabel htmlFor="email" required>メールアドレス</FormLabel>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <FormLabel htmlFor="password" required>パスワード</FormLabel>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${submitButtonClass} flex items-center justify-center gap-2`}>
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        アカウントをお持ちでない方は{' '}
        <Link href="/register" className="text-indigo-600 hover:underline">新規登録</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <FormLabel htmlFor="email" required>メールアドレス</FormLabel>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <FormLabel htmlFor="password" required>パスワード（8文字以上・英小文字と数字を含む）</FormLabel>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          aria-describedby="password-hint"
          title="8文字以上で、英小文字（a-z）と数字（0-9）をそれぞれ1文字以上含めてください"
          className={inputClass}
        />
        <p id="password-hint" className="mt-1 text-xs text-zinc-600">
          8文字以上で、英小文字（a-z）と数字（0-9）をそれぞれ1文字以上含めてください。
        </p>
      </div>
      <div>
        <FormLabel htmlFor="nickname" required>ニックネーム</FormLabel>
        <input id="nickname" name="nickname" type="text" required className={inputClass} />
      </div>
      <div>
        <FormLabel htmlFor="affiliation" optional>所属機関</FormLabel>
        <input id="affiliation" name="affiliation" type="text" className={inputClass} />
      </div>
      <div>
        <FormLabel htmlFor="field" optional>研究分野</FormLabel>
        <input id="field" name="field" type="text" className={inputClass} />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${submitButtonClass} flex items-center justify-center gap-2`}>
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? '登録中…' : '登録する'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">ログイン</Link>
      </p>
    </form>
  );
}
