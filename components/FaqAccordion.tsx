'use client';

import { useState } from 'react';

const FAQS = [
  {
    question: 'ポイントはどうやって貯まりますか？',
    answer:
      '他の人が作成したアンケートに回答すると、回答の品質に応じてポイントが付与されます。雑な回答（アテンションチェック誤答や極端に短い回答など）は付与額が減るか、付与されない場合があります。',
  },
  {
    question: 'アンケートの公開に費用はかかりますか？',
    answer:
      'アンケートの公開には、回答者に支払うポイントが必要です。回答が届くたびに、回答の品質に応じたポイントが保有ポイントから消費されます。共有リンク（限定公開）からの回答はポイントの消費・付与はありません。',
  },
  {
    question: 'フォロー機能はどう使いますか？',
    answer:
      '気になるユーザーのプロフィールページからフォローできます。フォロー中のユーザーが新しいアンケートを公開すると通知が届き、ホームや/surveysのタイムラインにも表示されます。',
  },
  {
    question: '退会したい場合は？',
    answer:
      'マイページの設定からアカウントの削除を行えます。削除すると作成したアンケートや回答データも削除され、復元できませんのでご注意ください。',
  },
];

/** ホーム下部のFAQアコーディオン（静的5問） */
export default function FaqAccordion() {
  const [openItems, setOpenItems] = useState<Map<number, boolean>>(new Map());

  const toggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Map(prev);
      next.set(index, !next.get(index));
      return next;
    });
  };

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold text-slate-800">よくある質問</h2>
      <div className="card-3d divide-y divide-slate-100 p-2">
        {FAQS.map((faq, i) => {
          const open = openItems.get(i) ?? false;
          return (
            <div key={i}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-answer-${i}`}
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-medium text-slate-700"
              >
                <span>{faq.question}</span>
                <span aria-hidden="true" className="shrink-0 text-slate-400">
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && (
                <div id={`faq-answer-${i}`} role="region" className="px-4 pb-4 text-sm text-slate-500">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
