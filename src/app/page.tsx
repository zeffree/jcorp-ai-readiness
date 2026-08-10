import Link from "next/link";
import {
  ALL_ITEMS,
  ALL_SUB_DIMENSIONS,
  FRAMEWORK,
  READINESS_BANDS,
} from "@/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "@/config/segments";
import { AppHeader } from "@/components/AppHeader";

export default function HomePage() {
  return (
    <>
      <AppHeader
        right={
          <Link
            href="/admin"
            className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Management dashboard
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="rounded-xl border border-brand-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            JCorp Group
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-900 sm:text-4xl">
            Where do we really stand on AI readiness?
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            This assessment benchmarks leaders across the JCorp group on two
            things: whether people feel supported, able and willing to work
            differently with AI, and whether their organisation is ready to make
            the shifts an agentic future demands. It follows the structure of
            the McKinsey AI Individual &amp; Organizational Assessment.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Statements", value: ALL_ITEMS.length },
              { label: "Sub-dimensions", value: ALL_SUB_DIMENSIONS.length },
              { label: "Companies", value: ORGANIZATIONS.length },
              { label: "Minutes", value: "~12" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-brand-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-600">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-brand-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/assess"
              className="rounded-md bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              Start the assessment
            </Link>
            <span className="text-sm text-muted">
              You will see your own results as soon as you submit.
            </span>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-sm font-semibold text-amber-900">
            Your responses are anonymous
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            No name, email address or IP address is recorded. The only things
            stored alongside your answers are your organisation and your
            cross-functional role, and management only ever sees group averages.
            Any group with fewer than three responses is hidden entirely so a
            small team can never be traced back to one person.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {FRAMEWORK.map((pillar) => (
            <div
              key={pillar.id}
              className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-brand-900">
                {pillar.label}
              </h2>
              <p className="mt-1 text-sm italic text-muted">{pillar.question}</p>
              <div className="mt-4 space-y-4">
                {pillar.categories.map((category) => (
                  <div key={category.id}>
                    <h3 className="text-sm font-semibold text-brand-700">
                      {category.label}
                    </h3>
                    <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-600">
                      {category.subDimensions.map((sub, index) => (
                        <li key={sub.id}>
                          {sub.label}
                          {index < category.subDimensions.length - 1 ? " ·" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-900">
            How scores are read
          </h2>
          <p className="mt-1 text-sm text-muted">
            Every answer is converted to a 0–100 index and rolled up through
            sub-dimension, category and pillar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {READINESS_BANDS.map((band) => (
              <div
                key={band.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="text-sm font-semibold text-brand-900">
                    {band.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted">
                  {Math.floor(band.min)}–{Math.floor(band.max)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {band.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-900">
            Who is being benchmarked
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-brand-700">
                Organisations
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {ORGANIZATIONS.join(" · ")}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-700">
                Cross-functional roles
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {FUNCTION_ROLES.join(" · ")}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="no-print border-t border-brand-100 bg-white py-6 text-center text-xs text-muted">
        JCorp AI Readiness Assessment · Anonymous · Structured on the McKinsey AI
        Individual &amp; Organizational Assessment
      </footer>
    </>
  );
}
