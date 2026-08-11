import { NextResponse } from "next/server";
import { fetchScoredResponses } from "@/lib/responses";
import { aggregate } from "@/lib/scoring";

/**
 * Public endpoint used only to draw the "JCorp average" overlay on a
 * respondent's own results. It exposes group-wide averages and nothing that
 * could identify a segment or an individual.
 */
export async function GET() {
  const responses = await fetchScoredResponses();
  const group = aggregate(responses);

  return NextResponse.json({
    n: group.n,
    available: !group.empty,
    overall: group.overall,
    personal: group.personal,
    organizational: group.organizational,
    categories: group.categories,
    subDimensions: group.subDimensions,
  });
}
