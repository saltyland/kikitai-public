'use client';

import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Flame } from 'lucide-react';

export interface StreakCounterProps {
  /** 現在の連続回答日数 */
  streakDays: number;
  /** 回答済みの日付一覧（ISO文字列または Date）。今週分の判定に使う。 */
  activeDates: (string | Date)[];
}

/** 連続回答日数と今週の達成状況を表示するストリークUI。 */
export default function StreakCounter({ streakDays, activeDates }: StreakCounterProps) {
  const today = new Date();
  const weekDays = eachDayOfInterval({
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
  });
  const activeSet = activeDates.map((d) => new Date(d));
  const isActive = (day: Date) => activeSet.some((d) => isSameDay(d, day));
  const todayIsActive = isActive(today);

  return (
    <div className="card-3d flex items-center gap-4 rounded-2xl bg-white p-4">
      <div className="flex items-center gap-2">
        <Flame
          className={streakDays > 0 ? 'h-7 w-7 text-orange-500' : 'h-7 w-7 text-slate-300'}
          aria-hidden
        />
        <div>
          <p className="text-xl font-bold text-slate-800">
            {streakDays}
            <span className="ml-1 text-sm font-semibold text-slate-400">日連続</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {weekDays.map((day) => {
          const active = isActive(day);
          const todayCell = isToday(day);
          const atRisk = todayCell && !todayIsActive;
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400">{format(day, 'E', { locale: ja })}</span>
              <span
                className={
                  active
                    ? 'h-3 w-3 rounded-full bg-orange-500'
                    : atRisk
                      ? 'h-3 w-3 animate-pulse rounded-full border-2 border-orange-400 bg-white'
                      : 'h-3 w-3 rounded-full border border-slate-200 bg-white'
                }
                aria-label={active ? '回答済み' : '未回答'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
