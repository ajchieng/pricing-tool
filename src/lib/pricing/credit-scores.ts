export const CREDIT_SCORE_MIN = 0;
export const CREDIT_SCORE_MAX = 1200;
export const MAX_CREDIT_SCORES = 10;

export function averageCreditScores(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function normalizeCreditScores(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (score): score is number =>
        typeof score === "number" &&
        Number.isInteger(score) &&
        score >= CREDIT_SCORE_MIN &&
        score <= CREDIT_SCORE_MAX,
    )
    .slice(0, MAX_CREDIT_SCORES);
}

export function formatCreditScore(score: number): string {
  return Number.isInteger(score)
    ? String(score)
    : score.toLocaleString("en-AU", { maximumFractionDigits: 2 });
}
