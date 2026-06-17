'use client';

import React from 'react';
import Link from 'next/link';
import { loginWithGoogleAction, registerAction, type ActionState } from '@/app/actions/auth';
import { demoLoginAction, type DemoLoginState } from '@/app/actions/demo';
import { Spinner } from '@/components/ui/Spinner';
import { useActionState, useTransition } from 'react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const [demoPending, startDemoTransition] = useTransition();
  const [demoState, demoAction] = useActionState<DemoLoginState, FormData>(
    demoLoginAction,
    { error: null }
  );
  const boundAction = loginWithGoogleAction.bind(null, next);

  return (
    <div className="space-y-3">
      <form
        action={boundAction}
        onSubmit={() => startTransition(() => {})}
      >
        <button
          type="submit"
          disabled={pending || demoPending}
          className="btn-3d flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : <GoogleIcon />}
          {pending ? '移動中…' : 'Googleで続ける'}
        </button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">または</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={demoAction} onSubmit={() => startDemoTransition(() => {})}>
        <button
          type="submit"
          disabled={pending || demoPending}
          className="btn-3d flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-3 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-100 disabled:opacity-60"
        >
          {demoPending ? <Spinner className="h-4 w-4" /> : null}
          {demoPending ? 'デモ準備中…' : 'デモを試す（登録不要）'}
        </button>
      </form>

      {demoState.error && (
        <p className="text-center text-xs text-red-600" role="alert">
          {demoState.error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [agreed, setAgreed] = React.useState(false);

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>
          <Link href="/terms" target="_blank" className="font-medium text-brand-600 hover:underline">
            利用規約
          </Link>
          を読み、同意します
        </span>
      </label>

      <div className={agreed ? '' : 'pointer-events-none opacity-40'}>
        <LoginForm next={next} />
      </div>

      <p className="text-center text-sm text-slate-600">
        すでにアカウントをお持ちの方も{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="text-brand-600 hover:underline"
        >
          こちら
        </Link>
        から
      </p>
      {process.env.NODE_ENV !== 'production' && <DevRegisterForm next={next} />}
    </div>
  );
}

/** 開発環境限定：Googleアカウントなしで新規登録をテストするためのメール/パスワード登録フォーム */
function DevRegisterForm({ next }: { next?: string }) {
  const initialState: ActionState = { error: null };
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
      <p className="text-xs font-bold text-amber-700">テストモード：メール・パスワードで新規登録</p>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="dev-register-email" className="text-xs text-slate-600">メールアドレス</label>
        <input
          id="dev-register-email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dev-register-password" className="text-xs text-slate-600">
          パスワード（8文字以上・英小文字と数字を含む）
        </label>
        <input
          id="dev-register-password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-3d w-full rounded-xl bg-amber-500 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? '登録中…' : 'テスト用アカウントを作成'}
      </button>
    </form>
  );
}
