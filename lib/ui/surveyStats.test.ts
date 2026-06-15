import { describe, expect, it } from 'vitest';
import { calcProgress, summarizeMySurveys } from './surveyStats';
import type { SurveyWithStats } from '@/lib/types/database';

const baseSurvey: Omit<SurveyWithStats, 'status' | 'required_count' | 'response_count'> = {
  id: 'dummy',
  user_id: 'user-1',
  title: 'dummy',
  description: null,
  sections: [],
  consent_text: null,
  target_conditions: null,
  min_trust_score: null,
  retention_until: null,
  visibility: 'public',
  share_token: 'dummy-token',
  share_link_no_reward: false,
  created_at: '2026-01-01T00:00:00Z',
  deadline: null,
};

function makeSurvey(overrides: Partial<SurveyWithStats>): SurveyWithStats {
  return {
    ...baseSurvey,
    status: 'open',
    required_count: 10,
    response_count: 0,
    ...overrides,
  };
}

describe('calcProgress', () => {
  it('0件のときは0%', () => {
    expect(calcProgress(0, 10)).toBe(0);
  });

  it('回答数と必要数から進捗率を算出する', () => {
    expect(calcProgress(5, 10)).toBe(50);
    expect(calcProgress(10, 10)).toBe(100);
  });

  it('必要数を超えても100%に丸める', () => {
    expect(calcProgress(15, 10)).toBe(100);
  });

  it('requiredCountが0の場合は0%（0除算ガード）', () => {
    expect(calcProgress(0, 0)).toBe(0);
    expect(calcProgress(5, 0)).toBe(0);
  });
});

describe('summarizeMySurveys', () => {
  it('空配列のときはすべて0', () => {
    const summary = summarizeMySurveys([]);
    expect(summary.statusCounts).toEqual({ draft: 0, open: 0, closed: 0 });
    expect(summary.openTotalResponses).toBe(0);
    expect(summary.openSurveys).toEqual([]);
  });

  it('ステータス別件数を集計する', () => {
    const surveys = [
      makeSurvey({ id: '1', status: 'draft' }),
      makeSurvey({ id: '2', status: 'open' }),
      makeSurvey({ id: '3', status: 'open' }),
      makeSurvey({ id: '4', status: 'closed' }),
    ];
    expect(summarizeMySurveys(surveys).statusCounts).toEqual({ draft: 1, open: 2, closed: 1 });
  });

  it('公開中アンケートの総回答数と各アンケートの進捗を算出する', () => {
    const surveys = [
      makeSurvey({ id: '1', status: 'open', title: 'A', response_count: 3, required_count: 10 }),
      makeSurvey({ id: '2', status: 'open', title: 'B', response_count: 10, required_count: 10 }),
      makeSurvey({ id: '3', status: 'closed', title: 'C', response_count: 5, required_count: 10 }),
    ];
    const summary = summarizeMySurveys(surveys);
    expect(summary.openTotalResponses).toBe(13);
    expect(summary.openSurveys).toEqual([
      { id: '1', title: 'A', responseCount: 3, requiredCount: 10, progress: 30 },
      { id: '2', title: 'B', responseCount: 10, requiredCount: 10, progress: 100 },
    ]);
  });
});
