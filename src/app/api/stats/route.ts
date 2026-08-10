import { NextResponse } from "next/server";
import { MIN_SEGMENT_SIZE } from "@/config/segments";
import { fetchScoredResponses } from "@/lib/responses";
import { aggregate } from "@/lib/scoring";

/**
 * Public endpoint used only to draw the "JCorp average" overlay on a
 * respondent's own results. It exposes group-wide averages and nothing that
 * could identify a segment or an individual.
 */
export async function GET() {
  const responses = await fetchScoredResponses();
  const group = aggregate(responses, MIN_SEGMENT_SIZE);

  return NextResponse.json({
    n: group.n,
    available: !group.suppressed,
    overall: group.overall,
    personal: group.personal,
    organizational: group.organizational,
    categories: group.categories,
    subDimensions: group.subDimensions,
    minSegmentSize: MIN_SEGMENT_SIZE,
  });
}
