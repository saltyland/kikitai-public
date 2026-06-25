import type {
  Answer,
  RespondentAttributes,
  UserResponse,
  SurveyWithQuestions,
} from '@/lib/types/database';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';

function renderAnswer(answers: Answer[], survey: SurveyWithQuestions, questionId: string): string {
  const q = survey.questions.find((x) => x.id === questionId);
  if (!q) return '';
  const forQ = answers.filter((a) => a.question_id === questionId);
  return QuestionTypeRegistry.get(q.type).renderAnswerText(forQ, q);
}

/** 回答者の属性をチップで表示（公開/非公開設定に依らず常に開示） */
function AttributeChips({ attributes }: { attributes: RespondentAttributes | null }) {
  if (!attributes) {
    return <span className="text-xs text-slate-400">属性情報なし（未ログインの回答）</span>;
  }
  const items: { label: string; value: string | number | null }[] = [
    { label: '年齢', value: attributes.age },
    { label: '性別', value: attributes.gender },
    { label: '職業', value: attributes.occupation },
    { label: '学年', value: attributes.grade },
    { label: '専攻', value: attributes.major },
    { label: '所属', value: attributes.affiliation },
    { label: '分野', value: attributes.field },
  ].filter((i) => i.value != null && i.value !== '');

  if (items.length === 0) {
    return <span className="text-xs text-slate-400">属性が登録されていません</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i.label}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-slate-600 ring-1 ring-brand-100"
        >
          <span className="text-slate-400">{i.label}</span>
          <span className="font-medium text-slate-700">{i.value}</span>
        </span>
      ))}
    </div>
  );
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
      <div className="rounded-lg bg-white border border-slate-200 px-4 py-10 text-center">
        <p className="text-sm font-medium text-slate-800">まだ回答がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
        回答者ごとの個別回答と属性を確認できます。ニックネームなどの個人情報は表示されません。
      </div>

      {userResponses.map((ur, idx) => (
        <section
          key={ur.responseId}
          className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* ヘッダー：匿名番号・回答日時・属性 */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">回答者 #{idx + 1}</p>
                <p className="text-xs text-slate-400">
                  {new Date(ur.createdAt).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
            <div className="mt-2.5">
              <AttributeChips attributes={ur.attributes} />
            </div>
          </div>

          {/* 回答一覧 */}
          <dl className="divide-y divide-slate-100">
            {survey.questions.map((q, qi) => {
              const text = renderAnswer(ur.answers, survey, q.id);
              return (
                <div key={q.id} className="px-5 py-3 flex gap-3 text-sm">
                  <dt className="w-5 shrink-0 text-brand-500 font-medium">Q{qi + 1}</dt>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5 truncate">{q.text}</p>
                    <dd className="text-slate-800 whitespace-pre-wrap break-words">
                      {text || <span className="text-slate-400">（未回答）</span>}
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
