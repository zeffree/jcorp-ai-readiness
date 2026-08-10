import { NextResponse } from "next/server";
import { MIN_SEGMENT_SIZE } from "@/config/segments";
import { isAdmin } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";
import { filtersFromSearchParams } from "@/lib/filters";
import { fetchScoredResponses } from "@/lib/responses";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = filtersFromSearchParams(url.searchParams);
  const responses = await fetchScoredResponses(filters);
  const payload = buildDashboard(responses, MIN_SEGMENT_SIZE);
  payload.totals.demo = await prisma.response.count({
    where: { isDemo: true },
  });

  return NextResponse.json(payload);
}
