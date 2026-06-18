import type { SurveyStatus, SurveyWithStats } from '@/lib/types/database';

/** 回答数/必要回答数から進捗率(%)を算出する（0除算ガード付き、0〜100にクランプ） */
export function calcProgress(responseCount: number, requiredCount: number): number {
  if (requiredCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((responseCount / requiredCount) * 100)));
}

/** /manageダッシュボード用の公開中アンケート1件分の進捗情報 */
export interface SurveyProgressSummary {
  id: string;
  title: string;
  responseCount: number;
  requiredCount: number;
  progress: number;
}

/** /manageダッシュボード用の集計結果 */
export interface ManageSummary {
  statusCounts: Record<SurveyStatus, number>;
  /** 公開中アンケートの総回答数 */
  openTotalResponses: number;
  /** 公開中アンケートごとの回答進捗 */
  openSurveys: SurveyProgressSummary[];
}

/** 自分のアンケート一覧から/manageダッシュボード用の集計結果を算出する */
export function summarizeMySurveys(surveys: SurveyWithStats[]): ManageSummary {
  const statusCounts: Record<SurveyStatus, number> = { draft: 0, open: 0, closed: 0 };
  const openSurveys: SurveyProgressSummary[] = [];
  let openTotalResponses = 0;

  for (const s of surveys) {
    statusCounts[s.status] += 1;
    if (s.status === 'open') {
      openTotalResponses += s.response_count;
      openSurveys.push({
        id: s.id,
        title: s.title,
        responseCount: s.response_count,
        requiredCount: s.required_count,
        progress: calcProgress(s.response_count, s.required_count),
      });
    }
  }

  return { statusCounts, openTotalResponses, openSurveys };
}
