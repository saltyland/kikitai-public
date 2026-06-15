'use client';

import Link from 'next/link';
import { loginWithGoogleAction } from '@/app/actions/auth';
import { demoLoginAction, type DemoLoginState } from '@/app/actions/demo';
import { Spinner } from '@/components/ui/Spinner';
import { useTransition, useActionState } from 'react';

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
  return (
    <div className="space-y-4">
      <LoginForm next={next} />
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
    </div>
  );
}
