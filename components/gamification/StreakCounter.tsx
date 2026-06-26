'use client';

import { eachDayOfInterval, isSameDay, startOfWeek } from 'date-fns';

export interface StreakCounterProps {
  /** 現在の連続回答日数 */
  streakDays: number;
  /** 回答した日付（直近のもの）一覧 */
  answeredDates: Date[];
  /** 今日すでに回答済みかどうか（false の場合は途切れそうな日として点滅表示） */
  answeredToday: boolean;
}

/** 連続回答日数と今週の回答状況をドットで表示するストリークカウンター */
export default function StreakCounter({ streakDays, answeredDates, answeredToday }: StreakCounterProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: today });

  return (
    <div className="card-3d rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span className={`text-2xl ${!answeredToday ? 'animate-pulse' : ''}`}>🔥</span>
        <p className="text-xl font-extrabold text-slate-800">{streakDays}日連続</p>
      </div>

      <div className="mt-3 flex gap-2">
        {weekDays.map((day) => {
          const isAnswered = answeredDates.some((d) => isSameDay(d, day));
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-slate-500">
                {day.toLocaleDateString('ja-JP', { weekday: 'short' })}
              </span>
              <span
                className={`text-sm ${isToday && !isAnswered ? 'animate-pulse' : ''} ${
                  isAnswered ? 'text-brand-600' : 'text-slate-300'
                }`}
              >
                {isAnswered ? '●' : '○'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
