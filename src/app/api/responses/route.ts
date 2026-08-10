import { NextResponse } from "next/server";
import { z } from "zod";
import { ALL_ITEM_IDS, SCALE_MAX, SCALE_MIN } from "@/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "@/config/segments";
import { prisma } from "@/lib/prisma";
import { scoreResponse } from "@/lib/scoring";

const submissionSchema = z.object({
  organization: z.enum(ORGANIZATIONS),
  functionRole: z.enum(FUNCTION_ROLES),
  durationSec: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 24)
    .optional(),
  answers: z.record(z.string(), z.number().int().min(SCALE_MIN).max(SCALE_MAX)),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { organization, functionRole, durationSec, answers } = parsed.data;

  const missing = ALL_ITEM_IDS.filter((itemId) => !(itemId in answers));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Some statements were not answered.", missing },
      { status: 400 },
    );
  }

  // Ignore anything the client sent that is not part of the framework, then
  // recompute every score server-side rather than trusting the submission.
  const cleanAnswers = Object.fromEntries(
    ALL_ITEM_IDS.map((itemId) => [itemId, answers[itemId]]),
  );
  const scored = scoreResponse(cleanAnswers);

  const created = await prisma.response.create({
    data: {
      organization,
      functionRole,
      durationSec: durationSec ?? null,
      personalScore: scored.pillars.personal,
      organizationalScore: scored.pillars.organizational,
      overallScore: scored.overall,
      band: scored.band,
      straightLined: scored.straightLined,
      scoresJson: JSON.stringify({
        subDimensions: scored.subDimensions,
        categories: scored.categories,
        pillars: scored.pillars,
        overall: scored.overall,
      }),
      answers: {
        create: ALL_ITEM_IDS.map((itemId) => ({
          itemId,
          value: cleanAnswers[itemId],
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
