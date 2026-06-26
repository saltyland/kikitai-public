'use client';

import SummaryCards, { SummaryCardsSkeleton, type SummaryData } from './SummaryCards';
import ResponseChart, { ResponseChartSkeleton, type DailyResponse } from './ResponseChart';
import QuestionBreakdown, {
  QuestionBreakdownSkeleton,
  type SurveyQuestionStats,
} from './QuestionBreakdown';
import TagCloud, { TagCloudSkeleton, type TagCount } from './TagCloud';

export interface ResearcherDashboardData {
  summary: SummaryData;
  dailyResponses: DailyResponse[];
  questionStats: SurveyQuestionStats[];
  respondentTags: TagCount[];
}

export default function ResearcherDashboard({
  data,
  isLoading = false,
}: {
  data?: ResearcherDashboardData;
  isLoading?: boolean;
}) {
  if (isLoading || !data) {
    return (
      <div className="space-y-6 dark:bg-slate-900">
        <SummaryCardsSkeleton />
        <ResponseChartSkeleton />
        <QuestionBreakdownSkeleton />
        <TagCloudSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={data.summary} />
      <ResponseChart data={data.dailyResponses} />
      <QuestionBreakdown surveys={data.questionStats} />
      <TagCloud tags={data.respondentTags} />
    </div>
  );
}
