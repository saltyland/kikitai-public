import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';
import { ResponseService } from '@/lib/services/responseService';
import { QuestionTypeRegistry } from '@/lib/domain/questions/registry';
import PrintButton from '@/components/PrintButton';

/**
 * 倫理委員会提出用サマリー（20位）。
 * 調査概要・インフォームドコンセント文・データ取り扱い（保持期間/対象条件）・
 * 設問一覧・回答状況を1枚にまとめた印刷向けページ。
 * ブラウザの「PDFとして保存」でそのまま提出資料になる（日本語フォントの
 * 埋め込みが不要なため、専用PDFライブラリではなく印刷CSSで実現している）。
 */
export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await new AuthService(supabase).getCurrentProfile();
  if (!profile) redirect('/login');

  let data;
  try {
    data = await new ResponseService(supabase).getResults(profile.id, id);
  } catch {
    redirect('/');
  }
  const { survey, responseCount } = data;

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ja-JP') : null);
  const statusLabel = { draft: '下書き', open: '公開中（回答受付中）', closed: '終了' }[survey.status];
  const tc = survey.target_conditions;
  const targetText = tc
    ? [
        tc.ageMin != null || tc.ageMax != null
          ? `年齢 ${tc.ageMin ?? ''}〜${tc.ageMax ?? ''}歳`
          : null,
        tc.genders?.length ? `性別：${tc.genders.join('・')}` : null,
        tc.occupations?.length ? `職業：${tc.occupations.join('・')}` : null,
      ]
        .filter(Boolean)
        .join(' / ')
    : '制限なし（全回答者に配信）';

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8 bg-white text-zinc-800 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/surveys/${survey.id}/results`} className="text-sm text-indigo-600 hover:underline">
          ← 結果に戻る
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-xl font-bold border-b-2 border-zinc-800 pb-2">
        調査実施サマリー（倫理審査・記録用）
      </h1>

      <Section title="1. 調査概要">
        <Row label="調査タイトル" value={survey.title} />
        <Row label="調査の説明" value={survey.description ?? '（なし）'} />
        <Row label="実施者（プラットフォーム上の表示名）" value={profile.nickname} />
        <Row label="作成日" value={fmt(survey.created_at) ?? '-'} />
        <Row label="状態" value={statusLabel} />
        <Row label="目標回答数" value={`${survey.required_count}件`} />
        <Row label="現在の回答数" value={`${responseCount}件`} />
        <Row label="回答期限" value={fmt(survey.deadline) ?? '設定なし'} />
      </Section>

      <Section title="2. インフォームドコンセント">
        <p className="text-sm leading-relaxed whitespace-pre-wrap rounded border border-zinc-300 p-3">
          {survey.consent_text ?? '（未設定）'}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          ※ 上記の説明文は回答画面の冒頭に表示され、明示的に同意した回答者のみが設問に進めます。
          同意状態は保存されず、セッションごとに再同意を求めます。
        </p>
      </Section>

      <Section title="3. データの取り扱い">
        <Row
          label="データ保持期限"
          value={
            survey.retention_until
              ? `${fmt(survey.retention_until)} まで（超過後は回答データを自動削除）`
              : '無期限（自動削除なし）'
          }
        />
        <Row label="配信対象の条件" value={targetText} />
        <Row
          label="回答者の制限"
          value={
            survey.min_trust_score != null
              ? `信頼スコア ${survey.min_trust_score} 以上の回答者のみ`
              : '制限なし'
          }
        />
        <Row
          label="品質管理"
          value="全回答にAI品質評価とルールベース検査（アテンションチェック・回答時間・機械的回答の検出）を実施"
        />
      </Section>

      <Section title="4. 設問構成">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-400 text-left text-xs text-zinc-500">
              <th className="py-1 pr-2 w-8">#</th>
              <th className="py-1 pr-2">設問</th>
              <th className="py-1 pr-2 w-36">形式</th>
              <th className="py-1 w-12">必須</th>
            </tr>
          </thead>
          <tbody>
            {survey.questions.map((q, i) => (
              <tr key={q.id} className="border-b border-zinc-200 align-top">
                <td className="py-1.5 pr-2 text-zinc-500">{i + 1}</td>
                <td className="py-1.5 pr-2">{q.text}</td>
                <td className="py-1.5 pr-2 text-zinc-500">
                  {QuestionTypeRegistry.get(q.type).label}
                </td>
                <td className="py-1.5">{q.required ? '必須' : '任意'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <p className="mt-8 text-xs text-zinc-400">
        本書は学術アンケートプラットフォーム「キキタイ」により {new Date().toLocaleDateString('ja-JP')} に自動生成されました。
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-base font-bold border-l-4 border-zinc-700 pl-2">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-zinc-200 py-1.5 text-sm">
      <span className="w-56 shrink-0 text-zinc-500">{label}</span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}
