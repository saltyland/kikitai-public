'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import SurveyCard from '@/components/SurveyCard';
import ScrollArrowButton from '@/components/ScrollArrowButton';
import type { SurveyWithStats } from '@/lib/types/database';

/** /surveys のタイムラインで使う横スクロール行（PCは矢印ナビ、モバイルはネイティブスクロール+snap） */
export default function HorizontalSurveyRow({
  title,
  description,
  surveys,
  emptyMessage,
}: {
  title: string;
  description?: ReactNode;
  surveys: SurveyWithStats[];
  emptyMessage?: string;
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
        <h2 className="mb-1 text-lg font-bold text-slate-800">{title}</h2>
        {description && <p className="mb-3 text-sm text-slate-400">{description}</p>}
        <div className="card-3d px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-bold text-slate-800">{title}</h2>
      {description && <p className="mb-3 text-sm text-slate-400">{description}</p>}
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
    </section>
  );
}
