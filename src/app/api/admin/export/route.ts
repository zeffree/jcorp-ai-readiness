import { ALL_ITEMS, ALL_SUB_DIMENSIONS } from "@/config/framework";
import { isAdmin } from "@/lib/auth";
import { filtersFromSearchParams } from "@/lib/filters";
import { fetchScoredResponses } from "@/lib/responses";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number | boolean | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Not authorised.", { status: 401 });
  }

  const url = new URL(request.url);
  const filters = filtersFromSearchParams(url.searchParams);
  const responses = await fetchScoredResponses(filters, true);

  const header = [
    "response_id",
    "submitted_at",
    "organization",
    "cross_functional_role",
    "straight_lined",
    "overall_index",
    "personal_index",
    "organizational_index",
    ...ALL_SUB_DIMENSIONS.map((sub) => `sub_${sub.id}`),
    ...ALL_ITEMS.map((item) => `item_${item.id}`),
  ];

  const rows = responses.map((response) => [
    response.id,
    response.createdAt,
    response.organization,
    response.functionRole,
    response.straightLined,
    response.overallScore,
    response.personalScore,
    response.organizationalScore,
    ...ALL_SUB_DIMENSIONS.map(
      (sub) => response.scores.subDimensions[sub.id] ?? "",
    ),
    ...ALL_ITEMS.map((item) => response.answers?.[item.id] ?? ""),
  ]);

  const csv = toCsv([header, ...rows]);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jcorp-ai-readiness-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
