"use client";

import { ALL_ITEM_IDS } from "@/config/framework";
import { BASE_PATH } from "@/lib/static-mode";
import { type AggregateInput, scoreResponse } from "@/lib/scoring";

/** Static showcase only: browser-side storage and filtering. */

export interface StaticRow extends AggregateInput {
  isDemo?: boolean;
}

export interface StaticFilters {
  organizations: string[];
  functionRoles: string[];
  from: string;
  to: string;
  excludeStraightLined: boolean;
  excludeDemo: boolean;
}

const LOCAL_KEY = "jcorp-ai-readiness-local-responses-v1";

export function loadLocalResponses(): StaticRow[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as StaticRow[]) : [];
  } catch {
    return [];
  }
}

export function submitLocalResponse(
  organization: string,
  functionRole: string,
  answers: Record<string, number>,
): string {
  const clean = Object.fromEntries(
    ALL_ITEM_IDS.map((itemId) => [itemId, answers[itemId]]),
  );
  const scored = scoreResponse(clean);
  const row: StaticRow = {
    id: crypto.randomUUID(),
    organization,
    functionRole,
    createdAt: new Date().toISOString(),
    personalScore: scored.pillars.personal,
    organizationalScore: scored.pillars.organizational,
    overallScore: scored.overall,
    straightLined: scored.straightLined,
    scores: {
      subDimensions: scored.subDimensions,
      categories: scored.categories,
      pillars: scored.pillars,
      overall: scored.overall,
    },
    isDemo: false,
  };
  const existing = loadLocalResponses();
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify([row, ...existing]));
  return row.id;
}

export async function loadDemoSnapshot(): Promise<StaticRow[]> {
  const response = await fetch(`${BASE_PATH}/demo-data.json`);
  if (!response.ok) throw new Error("Could not load demo data.");
  return (await response.json()) as StaticRow[];
}

export async function loadAllRows(): Promise<StaticRow[]> {
  const demo = await loadDemoSnapshot();
  return [...loadLocalResponses(), ...demo];
}

export function filterRows(
  rows: StaticRow[],
  filters: StaticFilters,
): StaticRow[] {
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00.000Z`) : null;
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999Z`) : null;
  return rows.filter((row) => {
    if (
      filters.organizations.length &&
      !filters.organizations.includes(row.organization)
    )
      return false;
    if (
      filters.functionRoles.length &&
      !filters.functionRoles.includes(row.functionRole)
    )
      return false;
    if (filters.excludeStraightLined && row.straightLined) return false;
    if (filters.excludeDemo && row.isDemo) return false;
    const created = Date.parse(row.createdAt);
    if (from !== null && created < from) return false;
    if (to !== null && created > to) return false;
    return true;
  });
}
