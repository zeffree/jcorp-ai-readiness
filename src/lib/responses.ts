import { prisma } from "@/lib/prisma";
import type { AggregateInput, ScoreBreakdown } from "@/lib/scoring";

export interface ResponseFilters {
  organizations?: string[];
  functionRoles?: string[];
  from?: Date;
  to?: Date;
  excludeStraightLined?: boolean;
  includeDemo?: boolean;
}

function parseScores(scoresJson: string): ScoreBreakdown {
  try {
    const parsed = JSON.parse(scoresJson) as Partial<ScoreBreakdown>;
    return {
      subDimensions: parsed.subDimensions ?? {},
      categories: parsed.categories ?? {},
      pillars: parsed.pillars ?? { personal: 0, organizational: 0 },
      overall: parsed.overall ?? 0,
    };
  } catch {
    return {
      subDimensions: {},
      categories: {},
      pillars: { personal: 0, organizational: 0 },
      overall: 0,
    };
  }
}

export async function fetchScoredResponses(
  filters: ResponseFilters = {},
  withAnswers = false,
): Promise<AggregateInput[]> {
  const rows = await prisma.response.findMany({
    where: {
      ...(filters.organizations?.length
        ? { organization: { in: filters.organizations } }
        : {}),
      ...(filters.functionRoles?.length
        ? { functionRole: { in: filters.functionRoles } }
        : {}),
      ...(filters.excludeStraightLined ? { straightLined: false } : {}),
      ...(filters.includeDemo === false ? { isDemo: false } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: withAnswers ? { answers: true } : undefined,
  });

  return rows.map((row) => ({
    id: row.id,
    organization: row.organization,
    functionRole: row.functionRole,
    createdAt: row.createdAt.toISOString(),
    personalScore: row.personalScore,
    organizationalScore: row.organizationalScore,
    overallScore: row.overallScore,
    straightLined: row.straightLined,
    scores: parseScores(row.scoresJson),
    answers:
      withAnswers && "answers" in row
        ? Object.fromEntries(
            (row.answers as { itemId: string; value: number }[]).map(
              (answer) => [answer.itemId, answer.value],
            ),
          )
        : undefined,
  }));
}

export async function fetchResponseById(
  id: string,
): Promise<AggregateInput | null> {
  const row = await prisma.response.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    organization: row.organization,
    functionRole: row.functionRole,
    createdAt: row.createdAt.toISOString(),
    personalScore: row.personalScore,
    organizationalScore: row.organizationalScore,
    overallScore: row.overallScore,
    straightLined: row.straightLined,
    scores: parseScores(row.scoresJson),
  };
}
