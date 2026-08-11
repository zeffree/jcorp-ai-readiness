import {
  ALL_CATEGORIES,
  ALL_SUB_DIMENSIONS,
  type PillarId,
} from "@/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "@/config/segments";
import {
  type Aggregate,
  type AggregateInput,
  aggregate,
  aggregateBy,
  distribution,
  rankSubDimensions,
  round1,
} from "@/lib/scoring";

export interface SegmentAggregate {
  label: string;
  aggregate: Aggregate;
}

export interface RankedItem {
  id: string;
  label: string;
  categoryLabel: string;
  pillarId: PillarId;
  score: number;
}

export interface Deviation {
  segment: string;
  segmentType: "Company" | "Function";
  subDimensionId: string;
  subDimensionLabel: string;
  score: number;
  groupScore: number;
  delta: number;
}

export interface DashboardPayload {
  generatedAt: string;
  totals: {
    responses: number;
    straightLined: number;
    organizationsCovered: number;
    functionsCovered: number;
    demo: number;
    latestResponseAt: string | null;
  };
  group: Aggregate;
  byOrganization: SegmentAggregate[];
  byFunction: SegmentAggregate[];
  coverage: {
    organization: string;
    total: number;
    counts: Record<string, number>;
  }[];
  distribution: {
    bucket: string;
    overall: number;
    personal: number;
    organizational: number;
  }[];
  strengths: RankedItem[];
  gaps: RankedItem[];
  standouts: Deviation[];
  laggards: Deviation[];
  categories: { id: string; label: string; pillarId: PillarId }[];
  subDimensions: {
    id: string;
    label: string;
    categoryLabel: string;
    pillarId: PillarId;
  }[];
  organizations: string[];
  functions: string[];
}

function deviations(
  segments: SegmentAggregate[],
  group: Aggregate,
  segmentType: "Company" | "Function",
): Deviation[] {
  const results: Deviation[] = [];
  for (const segment of segments) {
    if (segment.aggregate.empty) continue;
    for (const sub of ALL_SUB_DIMENSIONS) {
      const score = segment.aggregate.subDimensions[sub.id] ?? 0;
      const groupScore = group.subDimensions[sub.id] ?? 0;
      results.push({
        segment: segment.label,
        segmentType,
        subDimensionId: sub.id,
        subDimensionLabel: sub.label,
        score,
        groupScore,
        delta: round1(score - groupScore),
      });
    }
  }
  return results;
}

/**
 * Keep only each segment's single largest movement so the list reads across
 * the group rather than repeating whichever segment is furthest from average.
 */
function bestPerSegment(
  candidates: Deviation[],
  direction: "above" | "below",
): Deviation[] {
  const best = new Map<string, Deviation>();
  for (const candidate of candidates) {
    const key = `${candidate.segmentType}:${candidate.segment}`;
    const current = best.get(key);
    const better =
      !current ||
      (direction === "above"
        ? candidate.delta > current.delta
        : candidate.delta < current.delta);
    if (better) best.set(key, candidate);
  }
  return [...best.values()]
    .filter((entry) =>
      direction === "above" ? entry.delta > 0 : entry.delta < 0,
    )
    .sort((a, b) =>
      direction === "above" ? b.delta - a.delta : a.delta - b.delta,
    )
    .slice(0, 6);
}

export function buildDashboard(responses: AggregateInput[]): DashboardPayload {
  const group = aggregate(responses);
  const byOrganization = aggregateBy(responses, "organization", ORGANIZATIONS);
  const byFunction = aggregateBy(responses, "functionRole", FUNCTION_ROLES);

  const coverage = ORGANIZATIONS.map((organization) => {
    const counts: Record<string, number> = {};
    for (const role of FUNCTION_ROLES) {
      counts[role] = responses.filter(
        (r) => r.organization === organization && r.functionRole === role,
      ).length;
    }
    return {
      organization,
      total: responses.filter((r) => r.organization === organization).length,
      counts,
    };
  });

  const overallDist = distribution(responses, "overallScore");
  const personalDist = distribution(responses, "personalScore");
  const organizationalDist = distribution(responses, "organizationalScore");

  const ranked = group.empty ? [] : rankSubDimensions(group);
  const allDeviations = group.empty
    ? []
    : [
        ...deviations(byOrganization, group, "Company"),
        ...deviations(byFunction, group, "Function"),
      ];

  const timestamps = responses.map((r) => r.createdAt).sort();

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      responses: responses.length,
      straightLined: responses.filter((r) => r.straightLined).length,
      organizationsCovered: new Set(responses.map((r) => r.organization)).size,
      functionsCovered: new Set(responses.map((r) => r.functionRole)).size,
      demo: 0,
      latestResponseAt: timestamps.at(-1) ?? null,
    },
    group,
    byOrganization,
    byFunction,
    coverage,
    distribution: overallDist.map((bucket, index) => ({
      bucket: bucket.bucket,
      overall: bucket.count,
      personal: personalDist[index].count,
      organizational: organizationalDist[index].count,
    })),
    strengths: ranked.slice(0, 5),
    gaps: [...ranked].reverse().slice(0, 5),
    standouts: bestPerSegment(allDeviations, "above"),
    laggards: bestPerSegment(allDeviations, "below"),
    categories: ALL_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      pillarId: category.pillarId,
    })),
    subDimensions: ALL_SUB_DIMENSIONS.map((sub) => ({
      id: sub.id,
      label: sub.label,
      categoryLabel: sub.categoryLabel,
      pillarId: sub.pillarId,
    })),
    organizations: [...ORGANIZATIONS],
    functions: [...FUNCTION_ROLES],
  };
}
