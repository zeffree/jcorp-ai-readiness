import Link from "next/link";
import type { ReactNode } from "react";

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="no-print border-b border-brand-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-800 text-sm font-bold text-white">
            J
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-brand-900">
              JCorp AI Readiness Assessment
            </span>
            <span className="block text-xs text-muted">
              Personal &amp; organizational benchmark
            </span>
          </span>
        </Link>
        {right}
      </div>
    </header>
  );
}
