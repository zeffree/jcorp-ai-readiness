import { bandFor } from "@/config/framework";

export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const band = bandFor(score);
  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-white ${sizes[size]}`}
      style={{ backgroundColor: band.color }}
    >
      {band.label}
    </span>
  );
}

export function ScoreDial({
  score,
  label,
  caption,
}: {
  score: number;
  label: string;
  caption?: string;
}) {
  const band = bandFor(score);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="text-4xl font-semibold tabular-nums"
          style={{ color: band.color }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-sm text-muted">/ 100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            backgroundColor: band.color,
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <ScoreBadge score={score} size="sm" />
        {caption ? (
          <span className="text-xs text-muted">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Background colour for a heatmap cell on the shared 0-100 scale. */
export function heatColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  // Red (0) -> amber (50) -> green (100)
  const hue = (clamped / 100) * 130;
  const lightness = 92 - (clamped / 100) * 30;
  return `hsl(${hue} 62% ${lightness}%)`;
}

export function heatTextColor(score: number): string {
  return score >= 62 ? "#0f172a" : "#0f172a";
}
