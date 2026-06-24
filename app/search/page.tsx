import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import Header from '@/components/Header';

export default async function SearchPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <>
      <Header nickname={profile.nickname} avatarUrl={profile.avatar_url} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-lg font-bold text-slate-800">検索</h1>
        <div className="card-3d mt-4 flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-500">
            <Search className="h-8 w-8" />
          </div>
          <p className="text-sm font-medium text-slate-800">検索機能は準備中です</p>
          <p className="mt-2 text-xs text-slate-500">
            アンケート・ユーザーを検索できる機能を準備しています。
          </p>
        </div>
      </main>
    </>
  );
}
