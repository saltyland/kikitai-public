/** 回答数/必要回答数から進捗率(%)を算出する（0除算ガード付き、0〜100にクランプ） */
export function calcProgress(responseCount: number, requiredCount: number): number {
  if (requiredCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((responseCount / requiredCount) * 100)));
}
