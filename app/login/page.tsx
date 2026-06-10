import { LoginForm } from '@/components/AuthForms';

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-zinc-200">
        <h1 className="mb-1 text-center text-2xl font-bold text-indigo-700">キキタイ</h1>
        <p className="mb-6 text-center text-sm text-zinc-500">ログイン</p>
        <LoginForm />
      </div>
    </main>
  );
}
