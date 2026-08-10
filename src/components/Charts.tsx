"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bandFor } from "@/config/framework";

export interface RadarSeries {
  key: string;
  label: string;
  color: string;
  fillOpacity?: number;
}

export interface RadarPoint {
  label: string;
  [seriesKey: string]: string | number;
}

export function CategoryRadar({
  data,
  series,
  height = 380,
}: {
  data: RadarPoint[];
  series: RadarSeries[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#475569" }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tickCount={5}
          tick={false}
          axisLine={false}
        />
        {series.map((entry) => (
          <Radar
            key={entry.key}
            name={entry.label}
            dataKey={entry.key}
            stroke={entry.color}
            fill={entry.color}
            fillOpacity={entry.fillOpacity ?? 0.22}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
        <Tooltip
          formatter={(value) => `${value ?? ""}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export interface HorizontalBarDatum {
  label: string;
  value: number;
  comparison?: number;
}

export function ScoreBars({
  data,
  height,
  comparisonLabel,
  valueLabel = "Score",
}: {
  data: HorizontalBarDatum[];
  height?: number;
  comparisonLabel?: string;
  valueLabel?: string;
}) {
  const showComparison = data.some((row) => row.comparison !== undefined);
  const rowHeight = showComparison ? 34 : 26;
  const barSize = showComparison ? 11 : 14;
  const chartHeight = height ?? Math.max(240, data.length * rowHeight + 40);

  return (
    <div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barGap={2}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} stroke="#eef2f7" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tick={{ fontSize: 11, fill: "#475569" }}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {showComparison ? (
            <Bar
              dataKey="comparison"
              name={comparisonLabel ?? "Comparison"}
              fill="#cbd5e1"
              barSize={barSize}
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            />
          ) : null}
          <Bar
            dataKey="value"
            name={valueLabel}
            barSize={barSize}
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          >
            {data.map((row) => (
              <Cell key={row.label} fill={bandFor(row.value).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-6 rounded-sm"
            style={{
              background:
                "linear-gradient(to right, #b91c1c, #ca8a04, #15803d)",
            }}
          />
          {valueLabel} — coloured by readiness band
        </span>
        {showComparison ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-sm bg-slate-300" />
            {comparisonLabel ?? "Comparison"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DistributionChart({
  data,
}: {
  data: {
    bucket: string;
    overall: number;
    personal: number;
    organizational: number;
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="personal"
          name="Personal readiness"
          fill="#2b6098"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="organizational"
          name="Organizational readiness"
          fill="#14b8a6"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
