import { STATIC_DEMO } from "@/lib/static-mode";

/** Shown on every page of the GitHub Pages showcase build. */
export function DemoBanner() {
  if (!STATIC_DEMO) return null;
  return (
    <div className="no-print bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
      Showcase demo: the dashboard uses 520 synthetic responses. Your own answers
      stay in this browser and are never uploaded.
    </div>
  );
}
