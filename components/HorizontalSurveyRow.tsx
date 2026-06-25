'use client';

import Link from 'next/link';
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import SurveyCard from '@/components/SurveyCard';
import ScrollArrowButton from '@/components/ScrollArrowButton';
import type { SurveyWithStats } from '@/lib/types/database';

/** /surveys のタイムラインやホームのダイジェストで使う行（PCは矢印ナビ付き横スクロール、モバイルはネイティブスクロール+snap。layout="grid"で3列×縦スクロール表示） */
export default function HorizontalSurveyRow({
  title,
  description,
  surveys,
  emptyMessage,
  viewMoreHref,
  layout = 'scroll',
}: {
  title: string;
  description?: ReactNode;
  surveys: SurveyWithStats[];
  emptyMessage?: string;
  /** 指定時、見出し横に「もっと見る」リンクを表示する（ホームのダイジェスト行から/surveysへの誘導用） */
  viewMoreHref?: string;
  /** "scroll"（既定）: 横スクロールのカード列。"grid": 3列で並べて縦スクロールで閲覧 */
  layout?: 'scroll' | 'grid';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateArrows();
  }, [updateArrows, surveys]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9 * (direction === 'left' ? -1 : 1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (surveys.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="mb-10">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {viewMoreHref && (
            <Link href={viewMoreHref} className="text-sm font-medium text-brand-600 hover:underline">
              もっと見る
            </Link>
          )}
        </div>
        {description && <p className="mb-3 text-sm text-slate-400">{description}</p>}
        <div className="card-3d px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-2xl bg-brand-50/30 px-4 py-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {viewMoreHref && (
          <Link href={viewMoreHref} className="text-sm font-medium text-brand-600 hover:underline">
            もっと見る
          </Link>
        )}
      </div>
      {description && <p className="mb-3 text-sm text-slate-400">{description}</p>}
      {layout === 'grid' ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s) => (
            <SurveyCard key={s.id} survey={s} />
          ))}
        </div>
      ) : (
        <div className="group relative">
          <ScrollArrowButton direction="left" disabled={!canScrollLeft} onClick={() => scrollByAmount('left')} />
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="flex gap-4 overflow-x-auto scroll-px-4 snap-x snap-mandatory scrollbar-hide pb-2"
          >
            {surveys.map((s) => (
              <div key={s.id} className="w-72 shrink-0 snap-start">
                <SurveyCard survey={s} />
              </div>
            ))}
          </div>
          <ScrollArrowButton
            direction="right"
            disabled={!canScrollRight}
            onClick={() => scrollByAmount('right')}
          />
        </div>
      )}
    </section>
  );
}
