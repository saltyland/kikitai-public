'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Props {
  suggestions: string[];
  /** 「この提案を適用する」クリック時のハンドラ（編集画面に戻す等） */
  onApply?: (suggestion: string, index: number) => void;
}

/** AIからの改善提案を折りたたみ式アコーディオンで表示する */
export default function SuggestionAccordion({ suggestions, onApply }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 divide-y divide-slate-200">
      {suggestions.map((suggestion, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>💡</span>
                <span>{suggestion}</span>
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 text-slate-400"
              >
                <ChevronDown size={16} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1">
                    <button
                      type="button"
                      onClick={() => onApply?.(suggestion, index)}
                      className="rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 cursor-pointer"
                    >
                      この提案を適用する
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
