import { RegisterForm } from '@/components/AuthForms';

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card-3d w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-2xl font-extrabold text-sky-600">キキタイ</h1>
        <p className="mb-6 text-center text-sm text-slate-500">新規登録</p>
        <RegisterForm />
      </div>
    </main>
  );
}
