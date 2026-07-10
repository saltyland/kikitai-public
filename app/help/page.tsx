import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = {
  title: 'ヘルプ・よくある質問｜キキタイ',
  description:
    'キキタイの使い方、ポイントの貯め方・使い方、AI品質評価の仕組み、公開設定、退会方法などのよくある質問をまとめています。',
};

/** 質問1件分。<details>ベースでJS不要・キーボード操作可 */
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-slate-100 last:border-b-0">
      <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 text-left text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <span aria-hidden className="shrink-0 text-slate-400 group-open:hidden">＋</span>
        <span aria-hidden className="hidden shrink-0 text-slate-400 group-open:inline">−</span>
      </summary>
      <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-slate-500">{children}</div>
    </details>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
      <div className="card-3d p-2">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" aria-label="キキタイ トップ" className="inline-block">
        <Logo className="text-brand-600" />
      </Link>
      <h1 className="mt-8 text-2xl font-extrabold text-slate-800">ヘルプ・よくある質問</h1>
      <p className="mt-2 text-sm text-slate-500">
        キキタイの使い方で困ったときはこのページをご覧ください。解決しない場合は
        <Link href="/operator" className="text-brand-600 underline">運営者情報</Link>
        のお問い合わせ先までご連絡ください。
      </p>

      <Section title="はじめに">
        <Faq q="キキタイとは何ですか？">
          <p>
            学生・研究者のための「アンケートを回答し合う」プラットフォームです。他の人のアンケートに回答するとポイントが貯まり、
            そのポイントを使って自分のアンケートの回答者を集められます。回答の質はAIが自動評価するため、
            雑な回答が混ざりにくく、研究や課題に使えるデータを集めやすいのが特長です。
          </p>
        </Faq>
        <Faq q="まず何をすればいいですか？">
          <p>
            登録するとボーナスポイントが付与されますが、まずはホームの「アンケートに回答する」から
            いくつか回答してみるのがおすすめです。回答の流れとポイントの貯まり方が体感でき、
            自分のアンケートを公開するためのポイントも貯まります。
          </p>
        </Faq>
      </Section>

      <Section title="ポイント">
        <Faq q="ポイントはどうやって貯まりますか？">
          <p>
            他の人が作成したアンケートに回答すると、回答の品質に応じてポイントが付与されます。
            新規登録時にもボーナス（100pt）が付与されます。
          </p>
          <p>
            付与額は回答品質のAI評価によって変わります。丁寧な回答ほど満額に近づき、
            アテンションチェックの誤答や極端に短い自由記述など雑な回答は減額または0ptになります。
          </p>
        </Faq>
        <Faq q="ポイントに有効期限はありますか？">
          <p>
            あります。獲得したポイントは付与から180日で失効します。失効が近いポイントがある場合は
            プロフィール画面でお知らせします。
          </p>
        </Faq>
        <Faq q="アンケートの公開に費用はかかりますか？">
          <p>
            通常公開では、回答が届くたびに回答の品質に応じたポイントが保有ポイントから消費されます
            （公開した瞬間にまとめて消費されるわけではありません）。設問数・設問タイプによって1回答あたりのコストが変わり、
            作成画面で目安が確認できます。
          </p>
          <p>共有リンクによる限定公開は、ポイントの消費・付与ともにありません。</p>
        </Faq>
      </Section>

      <Section title="AIによる回答品質の評価">
        <Faq q="回答の品質はどのように評価されますか？">
          <p>
            回答を送信すると、ルールベースの検査（回答時間・パターン・アテンションチェックなど）と
            AIによる内容の評価を組み合わせて品質スコアが算出され、スコアの段階に応じて付与ポイントが決まります
            （満額〜0ptの5段階）。評価はふつう数秒以内に完了し、送信直後に結果が表示されます。
          </p>
          <p>
            詳しい仕組みは<Link href="/intelligence" className="text-brand-600 underline">AI評価の仕組み</Link>
            のページで紹介しています。
          </p>
        </Faq>
        <Faq q="真面目に答えたのに低い評価になりました">
          <p>
            自由記述が設問と関係ない内容に見える場合や、極端に短い場合に評価が下がることがあります。
            設問の意図に沿って、理由や具体例を一言添えると評価されやすくなります。
            評価には信頼スコア（アカウントの回答実績）も影響します。
          </p>
        </Faq>
      </Section>

      <Section title="アンケートの作成・公開">
        <Faq q="「通常公開」と「限定公開」の違いは？">
          <p>
            通常公開：キキタイのユーザーに配信され、ポイントを消費して回答を集めます。AI品質評価・属性ターゲティングが使えます。
          </p>
          <p>
            限定公開：共有リンクを知っている人だけが回答できます。ポイントの消費はありませんが、回答者への
            ポイント付与もありません。授業内やゼミ内など、回答者が決まっている場合に向いています。
          </p>
          <p>公開モードは作成時に選択し、作成後は変更できません。</p>
        </Faq>
        <Faq q="公開したアンケートを編集できますか？">
          <p>
            設問の編集は下書きの間だけ可能です。公開後に設問を変更すると、すでに集まった回答と設問の対応が
            崩れてしまうためです。公開後に修正が必要になった場合は、いったん終了して新しいアンケートを作成してください。
          </p>
        </Faq>
        <Faq q="回答者を属性で絞り込めますか？">
          <p>
            通常公開では、年齢・性別などの属性条件を設定して配信対象を絞り込めます。
            条件を設定しない場合は全員に配信されます。
          </p>
        </Faq>
      </Section>

      <Section title="回答">
        <Faq q="スキップしたアンケートはどうなりますか？">
          <p>
            スキップはその場で表示を送るだけで、記録は残りません。次にホームを開いたときに再び表示されることがあります。
          </p>
        </Faq>
        <Faq q="回答の途中で中断できますか？">
          <p>
            回答の入力内容は端末に自動保存されるため、途中でページを閉じても続きから再開できます。
            送信前の確認画面で内容を見直してから送信してください。
          </p>
        </Faq>
        <Faq q="回答は匿名ですか？">
          <p>
            アンケート作成者には、回答内容とあわせて回答者の属性情報が表示される場合があります。完全匿名ではありません。
            詳しくは<Link href="/privacy" className="text-brand-600 underline">プライバシーポリシー</Link>をご確認ください。
          </p>
        </Faq>
      </Section>

      <Section title="アカウント">
        <Faq q="フォロー機能はどう使いますか？">
          <p>
            気になるユーザーのプロフィールページからフォローできます。フォロー中のユーザーが新しいアンケートを公開すると
            通知が届き、ホームやアンケート一覧のタイムラインにも表示されます。
          </p>
        </Faq>
        <Faq q="退会したい場合は？">
          <p>
            プロフィールの設定からアカウントを削除できます。削除すると作成したアンケート・回答データ・保有ポイントも
            削除され、復元できませんのでご注意ください。
          </p>
        </Faq>
      </Section>

      <p className="mt-10 text-center text-xs text-slate-400">
        <Link href="/" className="text-brand-600 underline">ホームへ戻る</Link>
      </p>
    </main>
  );
}
