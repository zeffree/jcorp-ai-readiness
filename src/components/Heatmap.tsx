"use client";

import { heatColor } from "@/components/Score";

export interface HeatmapRow {
  label: string;
  n: number;
  empty: boolean;
  values: Record<string, number>;
}

export interface HeatmapColumn {
  id: string;
  label: string;
  group?: string;
}

export function Heatmap({
  rows,
  columns,
}: {
  rows: HeatmapRow[];
  columns: HeatmapColumn[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-semibold text-brand-800">
              Segment
            </th>
            <th className="bg-white px-2 py-2 text-center text-xs font-semibold text-brand-800">
              n
            </th>
            {columns.map((column) => (
              <th
                key={column.id}
                className="bg-white px-1 py-2 align-bottom text-[10px] font-medium leading-tight text-slate-600"
                style={{ minWidth: 62 }}
              >
                <span className="block">{column.label}</span>
                {column.group ? (
                  <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-slate-400">
                    {column.group}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap border-t border-slate-100 bg-white px-3 py-1.5 text-xs font-medium text-ink"
              >
                {row.label}
              </th>
              <td className="border-t border-slate-100 px-2 py-1.5 text-center text-xs tabular-nums text-muted">
                {row.n}
              </td>
              {row.empty
                ? columns.map((column) => (
                    <td
                      key={column.id}
                      className="border-t border-slate-100 px-1 py-1.5 text-center text-[10px] text-slate-400"
                      title="No responses yet"
                    >
                      —
                    </td>
                  ))
                : columns.map((column) => {
                    const value = row.values[column.id] ?? 0;
                    return (
                      <td
                        key={column.id}
                        className="border-t border-slate-100 px-1 py-1.5"
                      >
                        <div
                          className="rounded px-1 py-1 text-center text-[11px] font-semibold tabular-nums text-ink"
                          style={{ backgroundColor: heatColor(value) }}
                          title={`${row.label} · ${column.label}: ${value.toFixed(1)}`}
                        >
                          {value.toFixed(0)}
                        </div>
                      </td>
                    );
                  })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span>0</span>
      <div
        className="h-2 w-40 rounded-full"
        style={{
          background: `linear-gradient(to right, ${heatColor(0)}, ${heatColor(
            25,
          )}, ${heatColor(50)}, ${heatColor(75)}, ${heatColor(100)})`,
        }}
      />
      <span>100</span>
    </div>
  );
}
