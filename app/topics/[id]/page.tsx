import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { SurveyService } from '@/lib/services/surveyService';
import { TopicService } from '@/lib/services/topicService';
import Header from '@/components/Header';
import TopicFollowButton from '@/components/TopicFollowButton';
import { SurveyStatusBadge } from '@/components/SurveyStatusBadge';

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const currentProfile = await new AuthService(supabase).getCurrentProfile();

  const topicService = new TopicService(supabase);
  const topic = await topicService.getById(id);
  if (!topic) notFound();

  const surveys = await new SurveyService(supabase).listSurveysByTopic(id);
  const isFollowing = currentProfile
    ? await topicService.isFollowingTopic(currentProfile.id, id)
    : false;

  return (
    <>
      <Header
        nickname={currentProfile?.nickname ?? ''}
        avatarUrl={currentProfile?.avatar_url ?? null}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <section className="card-3d p-6 mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{topic.category}</p>
              <h1 className="text-xl font-extrabold text-slate-800 truncate">{topic.name}</h1>
              {topic.description && (
                <p className="mt-1 text-sm text-slate-500">{topic.description}</p>
              )}
            </div>
            {currentProfile && (
              <TopicFollowButton topicId={topic.id} initialFollowing={isFollowing} />
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-800">このトピックのアンケート</h2>
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
                      <Link href={`/surveys/${s.id}`} className="btn-3d btn-3d-primary px-4 py-1.5">
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
