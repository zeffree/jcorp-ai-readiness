import Link from "next/link";
import {
  ALL_CATEGORIES,
  ALL_SUB_DIMENSIONS,
  bandFor,
} from "@/config/framework";
import { AppHeader } from "@/components/AppHeader";
import { CategoryRadar, ScoreBars } from "@/components/Charts";
import { ScoreBadge, ScoreDial } from "@/components/Score";
import { type AggregateInput, aggregate, round1 } from "@/lib/scoring";

export function ResultsView({
  response,
  all,
}: {
  response: AggregateInput;
  all: AggregateInput[];
}) {
  const group = aggregate(all);
  const comparisonAvailable = !group.empty;

  const band = bandFor(response.overallScore);

  const radarData = ALL_CATEGORIES.map((category) => ({
    label: category.label,
    you: response.scores.categories[category.id] ?? 0,
    ...(comparisonAvailable
      ? { jcorp: group.categories[category.id] ?? 0 }
      : {}),
  }));

  const radarSeries = [
    { key: "you", label: "You", color: "#2b6098", fillOpacity: 0.25 },
    ...(comparisonAvailable
      ? [
          {
            key: "jcorp",
            label: "JCorp average",
            color: "#14b8a6",
            fillOpacity: 0.12,
          },
        ]
      : []),
  ];

  const subDimensionRows = ALL_SUB_DIMENSIONS.map((sub) => ({
    id: sub.id,
    label: sub.label,
    pillarId: sub.pillarId,
    value: response.scores.subDimensions[sub.id] ?? 0,
    comparison: comparisonAvailable ? group.subDimensions[sub.id] : undefined,
  }));

  const ranked = [...subDimensionRows].sort((a, b) => b.value - a.value);
  const strengths = ranked.slice(0, 3);
  const focus = [...ranked].reverse().slice(0, 3);

  const pillarGap = round1(
    response.personalScore - response.organizationalScore,
  );

  return (
    <>
      <AppHeader
        right={
          <Link
            href="/"
            className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Home
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <section className="rounded-xl border border-brand-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            Your results
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-900">
            AI readiness: {band.label}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {response.organization} · {response.functionRole} · submitted{" "}
            {new Date(response.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
            {band.description}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ScoreDial
              score={response.overallScore}
              label="Overall readiness index"
              caption={
                comparisonAvailable
                  ? `JCorp ${group.overall.toFixed(1)}`
                  : undefined
              }
            />
            <ScoreDial
              score={response.personalScore}
              label="Personal readiness"
              caption={
                comparisonAvailable
                  ? `JCorp ${group.personal.toFixed(1)}`
                  : undefined
              }
            />
            <ScoreDial
              score={response.organizationalScore}
              label="Organizational readiness"
              caption={
                comparisonAvailable
                  ? `JCorp ${group.organizational.toFixed(1)}`
                  : undefined
              }
            />
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {pillarGap > 5
              ? `Your personal readiness runs ${Math.abs(pillarGap).toFixed(1)} points ahead of how ready you judge your organisation to be — you are further along than the system around you.`
              : pillarGap < -5
                ? `You rate your organisation ${Math.abs(pillarGap).toFixed(1)} points ahead of your own personal readiness — the enablers are there ahead of your own use of them.`
                : "Your personal readiness and your view of the organisation are closely matched."}
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-brand-900">
              Profile across the ten categories
            </h2>
            {comparisonAvailable ? (
              <span className="text-xs text-muted">
                Compared against {group.n} responses group-wide
              </span>
            ) : (
              <span className="text-xs text-muted">
                Group comparison appears once the first response is in
              </span>
            )}
          </div>
          <CategoryRadar data={radarData} series={radarSeries} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-900">
              Your strongest areas
            </h2>
            <ul className="mt-4 space-y-3">
              {strengths.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                >
                  <span className="text-sm text-ink">{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-brand-900">
                      {row.value.toFixed(1)}
                    </span>
                    <ScoreBadge score={row.value} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-900">
              Where to focus next
            </h2>
            <ul className="mt-4 space-y-3">
              {focus.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                >
                  <span className="text-sm text-ink">{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-brand-900">
                      {row.value.toFixed(1)}
                    </span>
                    <ScoreBadge score={row.value} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {(["personal", "organizational"] as const).map((pillarId) => {
          const rows = subDimensionRows.filter(
            (row) => row.pillarId === pillarId,
          );
          return (
            <section
              key={pillarId}
              className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-brand-900">
                {pillarId === "personal"
                  ? "Personal readiness"
                  : "Organizational readiness"}{" "}
                by sub-dimension
              </h2>
              <div className="mt-4">
                <ScoreBars
                  data={rows.map((row) => ({
                    label: row.label,
                    value: row.value,
                    comparison: row.comparison,
                  }))}
                  valueLabel="You"
                  comparisonLabel="JCorp average"
                />
              </div>
            </section>
          );
        })}

        <div className="no-print mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Done
          </Link>
          <span className="text-xs text-muted">
            Use your browser&apos;s print function to save these results as a
            PDF. This page is not linked to your identity.
          </span>
        </div>
      </main>
    </>
  );
}
