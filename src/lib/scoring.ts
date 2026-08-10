import {
  ALL_CATEGORIES,
  ALL_ITEMS,
  ALL_SUB_DIMENSIONS,
  CATEGORY_BY_ID,
  ITEM_BY_ID,
  SCALE_MAX,
  SCALE_MIN,
  SUB_DIMENSION_BY_ID,
  bandFor,
  type PillarId,
} from "@/config/framework";

export type AnswerMap = Record<string, number>;

export interface ScoreBreakdown {
  /** 0-100 index per sub-dimension, keyed by sub-dimension id. */
  subDimensions: Record<string, number>;
  /** 0-100 index per category, keyed by category id. */
  categories: Record<string, number>;
  /** 0-100 index per pillar. */
  pillars: Record<PillarId, number>;
  overall: number;
}

export interface ScoredResponse extends ScoreBreakdown {
  band: string;
  straightLined: boolean;
}

/** Convert a raw 1-6 answer to a 0-100 index. */
export function normalise(raw: number): number {
  return ((raw - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Roll answers up through the framework.
 *
 * Sub-dimension = mean of its items. Category = mean of its sub-dimensions.
 * Pillar = unweighted mean of all sub-dimensions in the pillar, so a category
 * is not over-weighted simply because it contains more sub-dimensions.
 * Overall = mean of the two pillar scores.
 */
export function scoreAnswers(answers: AnswerMap): ScoreBreakdown {
  const subDimensions: Record<string, number> = {};

  for (const sub of ALL_SUB_DIMENSIONS) {
    const values = sub.items
      .map((item) => answers[item.id])
      .filter((value): value is number => typeof value === "number")
      .map(normalise);
    subDimensions[sub.id] = round1(mean(values));
  }

  const categories: Record<string, number> = {};
  for (const category of ALL_CATEGORIES) {
    categories[category.id] = round1(
      mean(category.subDimensions.map((sub) => subDimensions[sub.id])),
    );
  }

  const pillars = {
    personal: round1(
      mean(
        ALL_SUB_DIMENSIONS.filter((sub) => sub.pillarId === "personal").map(
          (sub) => subDimensions[sub.id],
        ),
      ),
    ),
    organizational: round1(
      mean(
        ALL_SUB_DIMENSIONS.filter(
          (sub) => sub.pillarId === "organizational",
        ).map((sub) => subDimensions[sub.id]),
      ),
    ),
  } satisfies Record<PillarId, number>;

  return {
    subDimensions,
    categories,
    pillars,
    overall: round1(mean([pillars.personal, pillars.organizational])),
  };
}

/** True when every answer carried the same value. */
export function isStraightLined(answers: AnswerMap): boolean {
  const values = Object.values(answers);
  if (values.length < 2) return false;
  return values.every((value) => value === values[0]);
}

export function scoreResponse(answers: AnswerMap): ScoredResponse {
  const breakdown = scoreAnswers(answers);
  return {
    ...breakdown,
    band: bandFor(breakdown.overall).label,
    straightLined: isStraightLined(answers),
  };
}

// ---------------------------------------------------------------------------
// Aggregation across many responses
// ---------------------------------------------------------------------------

export interface AggregateInput {
  id: string;
  organization: string;
  functionRole: string;
  createdAt: string;
  personalScore: number;
  organizationalScore: number;
  overallScore: number;
  straightLined: boolean;
  scores: ScoreBreakdown;
  answers?: AnswerMap;
}

export interface Aggregate {
  n: number;
  overall: number;
  personal: number;
  organizational: number;
  categories: Record<string, number>;
  subDimensions: Record<string, number>;
  band: string;
  suppressed: boolean;
}

export const EMPTY_AGGREGATE: Aggregate = {
  n: 0,
  overall: 0,
  personal: 0,
  organizational: 0,
  categories: {},
  subDimensions: {},
  band: "—",
  suppressed: true,
};

/**
 * Average a set of scored responses. Segments smaller than `minSegmentSize`
 * are returned flagged as suppressed with their scores zeroed, so a small cell
 * can never be read back to an individual.
 */
export function aggregate(
  responses: AggregateInput[],
  minSegmentSize: number,
): Aggregate {
  const n = responses.length;
  if (n === 0) return { ...EMPTY_AGGREGATE, n: 0 };

  if (n < minSegmentSize) {
    return { ...EMPTY_AGGREGATE, n, suppressed: true };
  }

  const categories: Record<string, number> = {};
  for (const category of ALL_CATEGORIES) {
    categories[category.id] = round1(
      mean(responses.map((r) => r.scores.categories[category.id] ?? 0)),
    );
  }

  const subDimensions: Record<string, number> = {};
  for (const sub of ALL_SUB_DIMENSIONS) {
    subDimensions[sub.id] = round1(
      mean(responses.map((r) => r.scores.subDimensions[sub.id] ?? 0)),
    );
  }

  const overall = round1(mean(responses.map((r) => r.overallScore)));

  return {
    n,
    overall,
    personal: round1(mean(responses.map((r) => r.personalScore))),
    organizational: round1(
      mean(responses.map((r) => r.organizationalScore)),
    ),
    categories,
    subDimensions,
    band: bandFor(overall).label,
    suppressed: false,
  };
}

/** Group responses by an attribute and aggregate each group. */
export function aggregateBy<K extends "organization" | "functionRole">(
  responses: AggregateInput[],
  key: K,
  values: readonly string[],
  minSegmentSize: number,
): { label: string; aggregate: Aggregate }[] {
  return values.map((value) => ({
    label: value,
    aggregate: aggregate(
      responses.filter((r) => r[key] === value),
      minSegmentSize,
    ),
  }));
}

export interface RankedSubDimension {
  id: string;
  label: string;
  categoryLabel: string;
  pillarId: PillarId;
  score: number;
}

export function rankSubDimensions(agg: Aggregate): RankedSubDimension[] {
  return ALL_SUB_DIMENSIONS.map((sub) => ({
    id: sub.id,
    label: sub.label,
    categoryLabel: sub.categoryLabel,
    pillarId: sub.pillarId,
    score: agg.subDimensions[sub.id] ?? 0,
  })).sort((a, b) => b.score - a.score);
}

export interface CategoryPoint {
  id: string;
  label: string;
  pillarId: PillarId;
  score: number;
}

export function categoryPoints(agg: Aggregate): CategoryPoint[] {
  return ALL_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    pillarId: category.pillarId,
    score: agg.categories[category.id] ?? 0,
  }));
}

/** Histogram of respondent-level indices in fixed 10-point buckets. */
export function distribution(
  responses: AggregateInput[],
  field: "overallScore" | "personalScore" | "organizationalScore",
): { bucket: string; count: number }[] {
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    bucket: `${index * 10}-${index * 10 + 9}`,
    count: 0,
  }));
  for (const response of responses) {
    const value = Math.max(0, Math.min(99.999, response[field]));
    buckets[Math.floor(value / 10)].count += 1;
  }
  buckets[9].bucket = "90-100";
  return buckets;
}

/** Item-level averages, used by the CSV export. */
export function itemAverages(
  responses: AggregateInput[],
): Record<string, number> {
  const totals: Record<string, { sum: number; n: number }> = {};
  for (const response of responses) {
    if (!response.answers) continue;
    for (const [itemId, value] of Object.entries(response.answers)) {
      if (!ITEM_BY_ID[itemId]) continue;
      totals[itemId] ??= { sum: 0, n: 0 };
      totals[itemId].sum += normalise(value);
      totals[itemId].n += 1;
    }
  }
  return Object.fromEntries(
    ALL_ITEMS.map((item) => {
      const total = totals[item.id];
      return [item.id, total && total.n > 0 ? round1(total.sum / total.n) : 0];
    }),
  );
}

export function categoryLabel(categoryId: string): string {
  return CATEGORY_BY_ID[categoryId]?.label ?? categoryId;
}

export function subDimensionLabel(subDimensionId: string): string {
  return SUB_DIMENSION_BY_ID[subDimensionId]?.label ?? subDimensionId;
}
