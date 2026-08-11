"use client";

import { useEffect, useMemo, useState } from "react";
import { ChipSelect } from "@/components/ChipSelect";
import { CategoryRadar, DistributionChart, ScoreBars } from "@/components/Charts";
import { HeatLegend, Heatmap } from "@/components/Heatmap";
import { ScoreBadge, ScoreDial } from "@/components/Score";
import type { DashboardPayload, SegmentAggregate } from "@/lib/dashboard";

type RowMode = "organization" | "function";
type ColumnMode = "category" | "subDimension";

const SERIES_COLORS = ["#2b6098", "#14b8a6", "#f59e0b", "#a855f7"];

interface Filters {
  organizations: string[];
  functionRoles: string[];
  from: string;
  to: string;
  excludeStraightLined: boolean;
  excludeDemo: boolean;
}

const initialFilters: Filters = {
  organizations: [],
  functionRoles: [],
  from: "",
  to: "",
  excludeStraightLined: false,
  excludeDemo: false,
};

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  for (const organization of filters.organizations) {
    params.append("organization", organization);
  }
  for (const role of filters.functionRoles) {
    params.append("role", role);
  }
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.excludeStraightLined) params.set("excludeStraightLined", "true");
  if (filters.excludeDemo) params.set("includeDemo", "false");
  return params.toString();
}

interface LoadState {
  key: string;
  data: DashboardPayload | null;
  error: string | null;
}

export function DashboardClient() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<LoadState | null>(null);
  const [rowMode, setRowMode] = useState<RowMode>("organization");
  const [columnMode, setColumnMode] = useState<ColumnMode>("category");
  const [compareSelection, setCompareSelection] = useState<string[] | null>(
    null,
  );

  const query = useMemo(() => buildQuery(filters), [filters]);
  const key = `${reloadToken}:${query}`;

  const loading = result?.key !== key;
  const data = result?.data ?? null;
  const error = result?.key === key ? result.error : null;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/admin/stats?${query}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load dashboard data.");
        const payload = (await response.json()) as DashboardPayload;
        if (active) setResult({ key, data: payload, error: null });
      } catch (loadError) {
        if (active) {
          setResult({
            key,
            data: null,
            error:
              loadError instanceof Error
                ? loadError.message
                : "Unexpected error.",
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [key, query]);

  const segments: SegmentAggregate[] = useMemo(() => {
    if (!data) return [];
    return rowMode === "organization" ? data.byOrganization : data.byFunction;
  }, [data, rowMode]);

  const availableSegments = useMemo(
    () => segments.filter((segment) => !segment.aggregate.empty),
    [segments],
  );

  // Falls back to the first three segments whenever the selection is empty or
  // no longer valid, which is what happens after switching row mode.
  const compare = useMemo(() => {
    const valid =
      compareSelection?.filter((label) =>
        availableSegments.some((segment) => segment.label === label),
      ) ?? [];
    return valid.length > 0
      ? valid
      : availableSegments.slice(0, 3).map((segment) => segment.label);
  }, [compareSelection, availableSegments]);

  const columns = useMemo(() => {
    if (!data) return [];
    return columnMode === "category"
      ? data.categories.map((category) => ({
          id: category.id,
          label: category.label,
          group:
            category.pillarId === "personal" ? "Personal" : "Organizational",
        }))
      : data.subDimensions.map((sub) => ({
          id: sub.id,
          label: sub.label,
          group: sub.categoryLabel,
        }));
  }, [data, columnMode]);

  const heatmapRows = useMemo(
    () =>
      segments.map((segment) => ({
        label: segment.label,
        n: segment.aggregate.n,
        empty: segment.aggregate.empty,
        values:
          columnMode === "category"
            ? segment.aggregate.categories
            : segment.aggregate.subDimensions,
      })),
    [segments, columnMode],
  );

  const radarData = useMemo(() => {
    if (!data) return [];
    return data.categories.map((category) => {
      const point: Record<string, string | number> = {
        label: category.label,
        group: data.group.categories[category.id] ?? 0,
      };
      for (const label of compare) {
        const segment = segments.find((entry) => entry.label === label);
        if (segment && !segment.aggregate.empty) {
          point[label] = segment.aggregate.categories[category.id] ?? 0;
        }
      }
      return point as { label: string } & Record<string, string | number>;
    });
  }, [data, compare, segments]);

  const radarSeries = useMemo(() => {
    const series = compare
      .filter((label) => {
        const segment = segments.find((entry) => entry.label === label);
        return segment && !segment.aggregate.empty;
      })
      .slice(0, 4)
      .map((label, index) => ({
        key: label,
        label,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        fillOpacity: 0.14,
      }));
    return [
      ...series,
      {
        key: "group",
        label: "Group average",
        color: "#94a3b8",
        fillOpacity: 0.08,
      },
    ];
  }, [compare, segments]);

  const league = useMemo(
    () =>
      [...segments].sort((a, b) => {
        if (a.aggregate.empty && b.aggregate.empty) return 0;
        if (a.aggregate.empty) return 1;
        if (b.aggregate.empty) return -1;
        return b.aggregate.overall - a.aggregate.overall;
      }),
    [segments],
  );

  const toggleCompare = (label: string) => {
    setCompareSelection(
      compare.includes(label)
        ? compare.filter((entry) => entry !== label)
        : compare.length >= 4
          ? compare
          : [...compare, label],
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            Management view
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-900">
            AI readiness benchmark
          </h1>
          <p className="mt-1 text-sm text-muted">
            Anonymous responses aggregated by company and cross-functional role.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadToken((current) => current + 1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Refresh
          </button>
          <a
            href={`/api/admin/export?${query}`}
            className="rounded-md bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-800"
          >
            Export CSV
          </a>
        </div>
      </div>

      <section className="no-print mt-6 rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <ChipSelect
            label="Organisation"
            options={data?.organizations ?? []}
            selected={filters.organizations}
            onChange={(next) =>
              setFilters((current) => ({ ...current, organizations: next }))
            }
          />
          <ChipSelect
            label="Cross-functional role"
            options={data?.functions ?? []}
            selected={filters.functionRoles}
            onChange={(next) =>
              setFilters((current) => ({ ...current, functionRoles: next }))
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-5 border-t border-slate-100 pt-4">
          <label className="text-xs font-medium text-brand-700">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-xs text-ink"
            />
          </label>
          <label className="text-xs font-medium text-brand-700">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.target.value }))
              }
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-xs text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-brand-700">
            <input
              type="checkbox"
              checked={filters.excludeStraightLined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  excludeStraightLined: event.target.checked,
                }))
              }
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Exclude straight-lined responses
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-brand-700">
            <input
              type="checkbox"
              checked={filters.excludeDemo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  excludeDemo: event.target.checked,
                }))
              }
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Exclude demo data
            {data && data.totals.demo > 0 ? (
              <span className="text-muted">({data.totals.demo} rows)</span>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => setFilters(initialFilters)}
            className="ml-auto rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Reset filters
          </button>
        </div>
      </section>

      {error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="mt-10 text-center text-sm text-muted">
          Loading dashboard…
        </p>
      ) : null}

      {data ? (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Responses
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-brand-900">
                {data.totals.responses}
              </p>
              <p className="mt-3 text-xs text-muted">
                {data.totals.organizationsCovered} of{" "}
                {data.organizations.length} companies ·{" "}
                {data.totals.functionsCovered} of {data.functions.length}{" "}
                functions
              </p>
            </div>
            <ScoreDial
              score={data.group.overall}
              label="Overall readiness index"
              caption={data.group.empty ? "Awaiting responses" : undefined}
            />
            <ScoreDial
              score={data.group.personal}
              label="Personal readiness"
            />
            <ScoreDial
              score={data.group.organizational}
              label="Organizational readiness"
            />
          </section>

          {data.group.empty ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No responses match these filters yet.
            </p>
          ) : null}

          <section className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-900">
                  Benchmark heatmap
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Every segment with at least one response is shown. Read thin
                  segments (low n) with care.
                </p>
              </div>
              <div className="no-print flex flex-wrap items-center gap-4">
                <Toggle
                  options={[
                    { value: "organization", label: "By company" },
                    { value: "function", label: "By function" },
                  ]}
                  value={rowMode}
                  onChange={(value) => setRowMode(value as RowMode)}
                />
                <Toggle
                  options={[
                    { value: "category", label: "Categories" },
                    { value: "subDimension", label: "Sub-dimensions" },
                  ]}
                  value={columnMode}
                  onChange={(value) => setColumnMode(value as ColumnMode)}
                />
              </div>
            </div>

            <div className="mt-4">
              <Heatmap rows={heatmapRows} columns={columns} />
            </div>
            <div className="mt-4">
              <HeatLegend />
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-5">
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm xl:col-span-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-brand-900">
                  Category profile comparison
                </h2>
                <span className="text-xs text-muted">
                  Select up to four segments
                </span>
              </div>
              <div className="no-print mt-3 flex flex-wrap gap-1.5">
                {segments.map((segment) => {
                  const disabled = segment.aggregate.empty;
                  const active = compare.includes(segment.label);
                  return (
                    <button
                      key={segment.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCompare(segment.label)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          : active
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                      }`}
                      title={disabled ? "No responses yet" : undefined}
                    >
                      {segment.label}
                      <span className="ml-1.5 opacity-70">
                        {segment.aggregate.n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <CategoryRadar
                  data={radarData}
                  series={radarSeries}
                  height={420}
                />
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold text-brand-900">
                League table
              </h2>
              <p className="mt-1 text-xs text-muted">
                Ranked by overall readiness index.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-2 font-medium">
                        {rowMode === "organization" ? "Company" : "Function"}
                      </th>
                      <th className="py-2 px-2 text-right font-medium">n</th>
                      <th className="py-2 px-2 text-right font-medium">
                        Personal
                      </th>
                      <th className="py-2 px-2 text-right font-medium">Org</th>
                      <th className="py-2 pl-2 text-right font-medium">
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {league.map((segment) => (
                      <tr
                        key={segment.label}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2 pr-2">
                          <span className="text-ink">{segment.label}</span>
                          {!segment.aggregate.empty ? (
                            <span className="ml-2 align-middle">
                              <ScoreBadge
                                score={segment.aggregate.overall}
                                size="sm"
                              />
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted">
                          {segment.aggregate.n}
                        </td>
                        {segment.aggregate.empty ? (
                          <td
                            colSpan={3}
                            className="py-2 pl-2 text-right text-xs text-slate-400"
                          >
                            no responses yet
                          </td>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-right tabular-nums">
                              {segment.aggregate.personal.toFixed(1)}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums">
                              {segment.aggregate.organizational.toFixed(1)}
                            </td>
                            <td className="py-2 pl-2 text-right font-semibold tabular-nums text-brand-900">
                              {segment.aggregate.overall.toFixed(1)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Group strengths
              </h2>
              <RankedList items={data.strengths} />
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Group gaps
              </h2>
              <RankedList items={data.gaps} />
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Furthest ahead of the group
              </h2>
              <DeviationList items={data.standouts} positive />
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Furthest behind the group
              </h2>
              <DeviationList items={data.laggards} />
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Score distribution
              </h2>
              <p className="mt-1 text-xs text-muted">
                Number of respondents in each 10-point band.
              </p>
              <div className="mt-4">
                <DistributionChart data={data.distribution} />
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-900">
                Group scores by sub-dimension
              </h2>
              <p className="mt-1 text-xs text-muted">
                All {data.subDimensions.length} sub-dimensions, group-wide.
              </p>
              <div className="mt-4">
                <ScoreBars
                  data={data.subDimensions.map((sub) => ({
                    label: sub.label,
                    value: data.group.subDimensions[sub.id] ?? 0,
                  }))}
                  valueLabel="Group average"
                />
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-900">
              Response coverage
            </h2>
            <p className="mt-1 text-xs text-muted">
              Raw counts by company and function, used to judge how much weight
              to put on each cell.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-3 py-2 font-semibold text-brand-800">
                      Company
                    </th>
                    {data.functions.map((role) => (
                      <th
                        key={role}
                        className="px-1 py-2 align-bottom text-[10px] font-medium leading-tight text-slate-600"
                        style={{ minWidth: 58 }}
                      >
                        {role}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right font-semibold text-brand-800">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.coverage.map((row) => (
                    <tr key={row.organization}>
                      <th
                        scope="row"
                        className="sticky left-0 whitespace-nowrap border-t border-slate-100 bg-white px-3 py-1.5 font-medium text-ink"
                      >
                        {row.organization}
                      </th>
                      {data.functions.map((role) => {
                        const count = row.counts[role] ?? 0;
                        return (
                          <td
                            key={role}
                            className={`border-t border-slate-100 px-1 py-1.5 text-center tabular-nums ${
                              count === 0 ? "text-slate-300" : "text-ink"
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}
                      <td className="border-t border-slate-100 px-2 py-1.5 text-right font-semibold tabular-nums text-brand-900">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-8 text-center text-xs text-muted">
            {data.totals.straightLined} response
            {data.totals.straightLined === 1 ? "" : "s"} flagged as
            straight-lined
            {data.totals.latestResponseAt
              ? ` · latest response ${new Date(data.totals.latestResponseAt).toLocaleString("en-GB")}`
              : ""}
          </p>
        </>
      ) : null}
    </main>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            value === option.value
              ? "bg-brand-700 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RankedList({
  items,
}: {
  items: DashboardPayload["strengths"];
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        Not enough responses to show this yet.
      </p>
    );
  }
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-2.5"
        >
          <span>
            <span className="block text-sm text-ink">{item.label}</span>
            <span className="block text-xs text-muted">
              {item.categoryLabel} ·{" "}
              {item.pillarId === "personal" ? "Personal" : "Organizational"}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-brand-900">
              {item.score.toFixed(1)}
            </span>
            <ScoreBadge score={item.score} size="sm" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function DeviationList({
  items,
  positive = false,
}: {
  items: DashboardPayload["standouts"];
  positive?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        Not enough responses to show this yet.
      </p>
    );
  }
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li
          key={`${item.segment}-${item.subDimensionId}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-2.5"
        >
          <span>
            <span className="block text-sm text-ink">
              {item.segment}
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {item.segmentType}
              </span>
            </span>
            <span className="block text-xs text-muted">
              {item.subDimensionLabel}
            </span>
          </span>
          <span className="text-right">
            <span
              className={`block text-sm font-semibold tabular-nums ${
                positive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {item.delta > 0 ? "+" : ""}
              {item.delta.toFixed(1)}
            </span>
            <span className="block text-xs text-muted tabular-nums">
              {item.score.toFixed(1)} vs {item.groupScore.toFixed(1)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
