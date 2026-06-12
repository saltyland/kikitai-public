'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, registerAction, type ActionState } from '@/app/actions/auth';
import { inputClass } from '@/lib/ui/styles';
import { FormLabel } from '@/components/ui/FormLabel';
import { Spinner } from '@/components/ui/Spinner';

const initial: ActionState = { error: null };

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
      <button
        type="submit"
        disabled={pending}
        className="btn-3d btn-3d-primary flex w-full items-center justify-center gap-2 py-2 text-sm"
      >
        {pending && <Spinner className="h-4 w-4" />}
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
      <button
        type="submit"
        disabled={pending}
        className="btn-3d btn-3d-primary flex w-full items-center justify-center gap-2 py-2 text-sm"
      >
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? '登録中…' : '登録する'}
      </button>
      <p className="text-center text-sm text-slate-600">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-brand-600 hover:underline">ログイン</Link>
      </p>
    </form>
  );
}
