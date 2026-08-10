import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  ALL_ITEMS,
  ALL_ITEM_IDS,
  ALL_SUB_DIMENSIONS,
  FRAMEWORK,
  ITEM_BY_ID,
  QUESTION_SCREENS,
  bandFor,
} from "@/config/framework";
import {
  type AggregateInput,
  aggregate,
  aggregateBy,
  distribution,
  isStraightLined,
  normalise,
  rankSubDimensions,
  scoreAnswers,
  scoreResponse,
} from "@/lib/scoring";

function answersOf(value: number): Record<string, number> {
  return Object.fromEntries(ALL_ITEM_IDS.map((id) => [id, value]));
}

function answersByPillar(
  personalValue: number,
  organizationalValue: number,
): Record<string, number> {
  return Object.fromEntries(
    ALL_ITEMS.map((item) => [
      item.id,
      item.pillarId === "personal" ? personalValue : organizationalValue,
    ]),
  );
}

function toAggregateInput(
  overrides: Partial<AggregateInput> & { answers: Record<string, number> },
): AggregateInput {
  const scores = scoreAnswers(overrides.answers);
  return {
    id: overrides.id ?? "test",
    organization: overrides.organization ?? "JCorp",
    functionRole: overrides.functionRole ?? "Strategy",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    personalScore: scores.pillars.personal,
    organizationalScore: scores.pillars.organizational,
    overallScore: scores.overall,
    straightLined: isStraightLined(overrides.answers),
    scores,
    answers: overrides.answers,
  };
}

describe("framework integrity", () => {
  it("has two pillars, ten categories and twenty-two sub-dimensions", () => {
    expect(FRAMEWORK).toHaveLength(2);
    expect(ALL_CATEGORIES).toHaveLength(10);
    expect(ALL_SUB_DIMENSIONS).toHaveLength(22);
  });

  it("has exactly two statements per sub-dimension, forty-four in total", () => {
    for (const sub of ALL_SUB_DIMENSIONS) {
      expect(sub.items).toHaveLength(2);
    }
    expect(ALL_ITEMS).toHaveLength(44);
  });

  it("splits eleven sub-dimensions into each pillar", () => {
    const personal = ALL_SUB_DIMENSIONS.filter(
      (sub) => sub.pillarId === "personal",
    );
    const organizational = ALL_SUB_DIMENSIONS.filter(
      (sub) => sub.pillarId === "organizational",
    );
    expect(personal).toHaveLength(13);
    expect(organizational).toHaveLength(9);
  });

  it("uses unique ids for items, sub-dimensions and categories", () => {
    expect(new Set(ALL_ITEM_IDS).size).toBe(ALL_ITEM_IDS.length);
    expect(new Set(ALL_SUB_DIMENSIONS.map((s) => s.id)).size).toBe(22);
    expect(new Set(ALL_CATEGORIES.map((c) => c.id)).size).toBe(10);
  });

  it("has non-empty wording on every statement", () => {
    for (const item of ALL_ITEMS) {
      expect(item.text.trim().length).toBeGreaterThan(10);
    }
  });
});

describe("questionnaire screens", () => {
  it("covers every statement exactly once across the screens", () => {
    const screenItemIds = QUESTION_SCREENS.flatMap((screen) =>
      screen.items.map((item) => item.id),
    );
    expect(screenItemIds).toHaveLength(44);
    expect(new Set(screenItemIds)).toEqual(new Set(ALL_ITEM_IDS));
  });

  it("keeps every screen to a readable length", () => {
    for (const screen of QUESTION_SCREENS) {
      expect(screen.items.length).toBeGreaterThanOrEqual(4);
      expect(screen.items.length).toBeLessThanOrEqual(8);
    }
  });

  it("never mixes the two pillars on one screen", () => {
    for (const screen of QUESTION_SCREENS) {
      const pillars = new Set(
        screen.items.map((item) => ITEM_BY_ID[item.id].pillarId),
      );
      expect(pillars.size).toBe(1);
      expect([...pillars][0]).toBe(screen.pillarId);
    }
  });
});

describe("normalise", () => {
  it("maps the six-point scale onto 0-100", () => {
    expect(normalise(1)).toBe(0);
    expect(normalise(6)).toBe(100);
    expect(normalise(2)).toBe(20);
    expect(normalise(5)).toBe(80);
  });
});

describe("scoreAnswers", () => {
  it("scores a uniformly maximum response at 100 everywhere", () => {
    const scores = scoreAnswers(answersOf(6));
    expect(scores.overall).toBe(100);
    expect(scores.pillars.personal).toBe(100);
    expect(scores.pillars.organizational).toBe(100);
    for (const sub of ALL_SUB_DIMENSIONS) {
      expect(scores.subDimensions[sub.id]).toBe(100);
    }
  });

  it("scores a uniformly minimum response at 0 everywhere", () => {
    const scores = scoreAnswers(answersOf(1));
    expect(scores.overall).toBe(0);
    expect(scores.categories.enablers).toBe(0);
  });

  it("keeps the two pillars independent", () => {
    const scores = scoreAnswers(answersByPillar(6, 1));
    expect(scores.pillars.personal).toBe(100);
    expect(scores.pillars.organizational).toBe(0);
    expect(scores.overall).toBe(50);
  });

  it("does not let a large category outweigh a small one within a pillar", () => {
    // Enablers holds 8 of the 13 personal sub-dimensions. Scoring the pillar as
    // a mean of sub-dimensions must reflect that weight, not a mean of the
    // three categories.
    const answers = Object.fromEntries(
      ALL_ITEMS.map((item) => [
        item.id,
        item.categoryId === "enablers" ? 6 : 1,
      ]),
    );
    const scores = scoreAnswers(answers);
    expect(scores.categories.enablers).toBe(100);
    expect(scores.categories.fluency).toBe(0);
    expect(scores.pillars.personal).toBeCloseTo((8 / 13) * 100, 1);
  });

  it("averages the two statements inside a sub-dimension", () => {
    const answers = answersOf(1);
    answers["P-FLU-SE-1"] = 6;
    const scores = scoreAnswers(answers);
    expect(scores.subDimensions["self-efficacy"]).toBe(50);
  });
});

describe("bands", () => {
  it("assigns the expected band at each boundary", () => {
    expect(bandFor(0).label).toBe("Nascent");
    expect(bandFor(39.9).label).toBe("Nascent");
    expect(bandFor(40).label).toBe("Emerging");
    expect(bandFor(55).label).toBe("Developing");
    expect(bandFor(70).label).toBe("Advanced");
    expect(bandFor(85).label).toBe("Leading");
    expect(bandFor(100).label).toBe("Leading");
  });
});

describe("straight-lining", () => {
  it("flags a response where every answer is identical", () => {
    expect(scoreResponse(answersOf(4)).straightLined).toBe(true);
  });

  it("does not flag a varied response", () => {
    const answers = answersOf(4);
    answers["P-ENB-UC-1"] = 2;
    expect(scoreResponse(answers).straightLined).toBe(false);
  });
});

describe("aggregate", () => {
  const minSegmentSize = 3;

  it("suppresses a segment below the minimum size", () => {
    const responses = [toAggregateInput({ answers: answersOf(6) })];
    const result = aggregate(responses, minSegmentSize);
    expect(result.n).toBe(1);
    expect(result.suppressed).toBe(true);
    expect(result.overall).toBe(0);
  });

  it("averages a segment at or above the minimum size", () => {
    const responses = [
      toAggregateInput({ id: "a", answers: answersOf(6) }),
      toAggregateInput({ id: "b", answers: answersOf(1) }),
      toAggregateInput({ id: "c", answers: answersOf(6) }),
    ];
    const result = aggregate(responses, minSegmentSize);
    expect(result.suppressed).toBe(false);
    expect(result.n).toBe(3);
    expect(result.overall).toBeCloseTo(66.7, 1);
  });

  it("returns an empty aggregate with no responses", () => {
    const result = aggregate([], minSegmentSize);
    expect(result.n).toBe(0);
    expect(result.suppressed).toBe(true);
  });

  it("groups by organization and suppresses thin cells", () => {
    const responses = [
      toAggregateInput({ id: "a", organization: "KPJ", answers: answersOf(6) }),
      toAggregateInput({ id: "b", organization: "KPJ", answers: answersOf(6) }),
      toAggregateInput({ id: "c", organization: "KPJ", answers: answersOf(6) }),
      toAggregateInput({ id: "d", organization: "QSR", answers: answersOf(3) }),
    ];
    const grouped = aggregateBy(
      responses,
      "organization",
      ["KPJ", "QSR"],
      minSegmentSize,
    );
    const kpj = grouped.find((entry) => entry.label === "KPJ");
    const qsr = grouped.find((entry) => entry.label === "QSR");
    expect(kpj?.aggregate.overall).toBe(100);
    expect(qsr?.aggregate.suppressed).toBe(true);
    expect(qsr?.aggregate.n).toBe(1);
  });
});

describe("rankSubDimensions", () => {
  it("orders sub-dimensions from strongest to weakest", () => {
    const answers = answersOf(3);
    for (const item of ALL_ITEMS) {
      if (item.subDimensionId === "governance") answers[item.id] = 6;
      if (item.subDimensionId === "ai-usage") answers[item.id] = 1;
    }
    const responses = [1, 2, 3].map((index) =>
      toAggregateInput({ id: `r${index}`, answers }),
    );
    const ranked = rankSubDimensions(aggregate(responses, 3));
    expect(ranked[0].id).toBe("governance");
    expect(ranked.at(-1)?.id).toBe("ai-usage");
  });
});

describe("distribution", () => {
  it("buckets respondent indices into ten bands", () => {
    const responses = [
      toAggregateInput({ id: "a", answers: answersOf(1) }),
      toAggregateInput({ id: "b", answers: answersOf(6) }),
      toAggregateInput({ id: "c", answers: answersOf(6) }),
    ];
    const buckets = distribution(responses, "overallScore");
    expect(buckets).toHaveLength(10);
    expect(buckets[0].count).toBe(1);
    expect(buckets[9].count).toBe(2);
    expect(buckets[9].bucket).toBe("90-100");
  });
});
