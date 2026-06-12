import type { Answer, UserResponse, SurveyWithQuestions } from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import Avatar from '@/components/Avatar';

function renderAnswer(answers: Answer[], survey: SurveyWithQuestions, questionId: string): string {
  const q = survey.questions.find((x) => x.id === questionId);
  if (!q) return '';
  const forQ = answers.filter((a) => a.question_id === questionId);
  return QuestionTypeRegistry.get(q.type).renderAnswerText(forQ, q);
}

/**
 * ユーザー別回答一覧（Proプラン限定）。
 * 回答者ごとに全設問の回答をまとめて表示する。
 */
export default function ResultPerUser({
  survey,
  userResponses,
}: {
  survey: SurveyWithQuestions;
  userResponses: UserResponse[];
}) {
  if (userResponses.length === 0) {
    return (
      <div className="rounded-lg bg-white border border-zinc-200 px-4 py-10 text-center">
        <p className="text-sm font-medium text-zinc-800">まだ回答がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        ユーザー別回答モード（Proプラン）— 回答者ごとの個別回答を確認できます。
      </div>

      {userResponses.map((ur, idx) => (
        <section
          key={ur.responseId}
          className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden"
        >
          {/* ヘッダー：アバター・ニックネーム・回答日時 */}
          <div className="flex items-center gap-3 bg-zinc-50 border-b border-zinc-200 px-5 py-3">
            <Avatar name={ur.nickname} src={ur.avatarUrl} className="h-8 w-8 text-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">
                {ur.userId ? (
                  <a
                    href={`/users/${ur.userId}`}
                    className="hover:underline text-indigo-600"
                  >
                    {ur.nickname}
                  </a>
                ) : (
                  <span className="text-zinc-500">{ur.nickname}</span>
                )}
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(ur.createdAt).toLocaleString('ja-JP')}
              </p>
            </div>
            <span className="text-xs text-zinc-400">#{idx + 1}</span>
          </div>

          {/* 回答一覧 */}
          <dl className="divide-y divide-zinc-100">
            {survey.questions.map((q, qi) => {
              const text = renderAnswer(ur.answers, survey, q.id);
              return (
                <div key={q.id} className="px-5 py-3 flex gap-3 text-sm">
                  <dt className="w-5 shrink-0 text-indigo-500 font-medium">Q{qi + 1}</dt>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-0.5 truncate">{q.text}</p>
                    <dd className="text-zinc-800 whitespace-pre-wrap break-words">
                      {text || <span className="text-zinc-400">（未回答）</span>}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
