"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ResultsView } from "@/components/ResultsView";
import { loadAllRows, type StaticRow } from "@/lib/static-store";

function ResultsLoader() {
  const id = useSearchParams().get("id");
  const [state, setState] = useState<
    { rows: StaticRow[]; found: StaticRow | null } | "loading"
  >("loading");

  useEffect(() => {
    void loadAllRows().then((rows) =>
      setState({ rows, found: rows.find((row) => row.id === id) ?? null }),
    );
  }, [id]);

  if (state === "loading") {
    return (
      <p className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted">
        Loading your results…
      </p>
    );
  }
  if (!state.found) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-brand-900">
          Result not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          In this demo, results are stored in your own browser only, so they
          are only available on the device where you took the assessment.
        </p>
        <Link
          href="/assess"
          className="mt-6 inline-block rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Take the assessment
        </Link>
      </main>
    );
  }
  return <ResultsView response={state.found} all={state.rows} />;
}

export default function ResultsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ResultsLoader />
      </Suspense>
    </>
  );
}
