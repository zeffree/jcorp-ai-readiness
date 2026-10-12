import { notFound } from "next/navigation";
import { ResultsView } from "@/components/ResultsView";
import { fetchResponseById, fetchScoredResponses } from "@/lib/responses";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await fetchResponseById(id);
  if (!response) notFound();

  const all = await fetchScoredResponses();
  return <ResultsView response={response} all={all} />;
}
