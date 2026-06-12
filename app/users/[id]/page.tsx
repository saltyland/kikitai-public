import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ProfileRepository } from '@/lib/repositories/profileRepository';
import { SurveyService } from '@/lib/services/surveyService';
import Header from '@/components/Header';
import Avatar from '@/components/Avatar';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';

/** SNSリンクのアイコン＋ラベル */
function SnsLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  // 簡易URLバリデーション（http/https のみ許可）
  if (!href.startsWith('http://') && !href.startsWith('https://')) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const currentProfile = await new AuthService(supabase).getCurrentProfile();

  const profileRepo = new ProfileRepository(supabase);
  const publicProfile = await profileRepo.findPublicById(id);
  if (!publicProfile) notFound();

  const surveys = await new SurveyService(supabase).listSurveysByUser(id);

  const sns = publicProfile.sns_links ?? {};

  return (
    <>
      <Header
        nickname={currentProfile?.nickname ?? ''}
        avatarUrl={currentProfile?.avatar_url ?? null}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* プロフィールカード */}
        <section className="card-3d p-6 mb-8">
          <div className="flex items-center gap-4">
            <Avatar name={publicProfile.nickname} src={publicProfile.avatar_url} className="h-16 w-16 text-2xl" />
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-800 truncate">{publicProfile.nickname}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(publicProfile.created_at).toLocaleDateString('ja-JP')} 登録
              </p>
            </div>
          </div>

          {/* 属性情報 */}
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {publicProfile.affiliation && (
              <>
                <dt className="text-slate-400">所属機関</dt>
                <dd className="font-medium text-slate-700">{publicProfile.affiliation}</dd>
              </>
            )}
            {publicProfile.field && (
              <>
                <dt className="text-slate-400">研究分野</dt>
                <dd className="font-medium text-slate-700">{publicProfile.field}</dd>
              </>
            )}
            {publicProfile.occupation && (
              <>
                <dt className="text-slate-400">職業</dt>
                <dd className="font-medium text-slate-700">{publicProfile.occupation}</dd>
              </>
            )}
            {publicProfile.grade && (
              <>
                <dt className="text-slate-400">学年</dt>
                <dd className="font-medium text-slate-700">{publicProfile.grade}</dd>
              </>
            )}
            {publicProfile.major && (
              <>
                <dt className="text-slate-400">専攻</dt>
                <dd className="font-medium text-slate-700">{publicProfile.major}</dd>
              </>
            )}
          </dl>

          {/* SNSリンク */}
          {Object.values(sns).some(Boolean) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {sns.twitter && (
                <SnsLink
                  href={sns.twitter}
                  label="Twitter / X"
                  icon={
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  }
                />
              )}
              {sns.instagram && (
                <SnsLink
                  href={sns.instagram}
                  label="Instagram"
                  icon={
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  }
                />
              )}
              {sns.github && (
                <SnsLink
                  href={sns.github}
                  label="GitHub"
                  icon={
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  }
                />
              )}
              {sns.website && (
                <SnsLink
                  href={sns.website}
                  label="ウェブサイト"
                  icon={
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                  }
                />
              )}
            </div>
          )}
        </section>

        {/* このユーザーのアンケート一覧 */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-800">公開中のアンケート</h2>
          {surveys.length === 0 ? (
            <div className="card-3d px-4 py-10 text-center">
              <p className="text-sm text-slate-500">現在公開中のアンケートはありません</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {surveys.map((s) => {
                const progress = Math.min(
                  100,
                  Math.round((s.response_count / Math.max(1, s.required_count)) * 100)
                );
                return (
                  <li key={s.id} className="card-3d p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-bold text-slate-800">{s.title}</h3>
                          <SurveyStatusBadge status={s.status} />
                        </div>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{s.description}</p>
                        )}
                      </div>
                    </div>
                    {/* 進捗バー */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>回答 {s.response_count} / {s.required_count}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 text-sm">
                      <Link
                        href={`/surveys/${s.id}`}
                        className="btn-3d btn-3d-primary px-4 py-1.5"
                      >
                        回答する
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
