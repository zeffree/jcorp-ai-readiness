"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_ITEM_IDS,
  QUESTION_SCREENS,
  SCALE_OPTIONS,
} from "@/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "@/config/segments";
import { AppHeader } from "@/components/AppHeader";
import { STATIC_DEMO } from "@/lib/static-mode";
import { submitLocalResponse } from "@/lib/static-store";

const STORAGE_KEY = "jcorp-ai-readiness-draft-v1";

interface Draft {
  organization: string;
  functionRole: string;
  answers: Record<string, number>;
  startedAt: number;
}

const emptyDraft: Draft = {
  organization: "",
  functionRole: "",
  answers: {},
  startedAt: Date.now(),
};

export default function AssessPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stored: Partial<Draft> | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as Partial<Draft>;
    } catch {
      // A corrupt draft simply starts the respondent again.
    }
    // localStorage can only be read after mount, so restoring a draft has to
    // happen here rather than in the initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) =>
      stored
        ? {
            organization: stored.organization ?? "",
            functionRole: stored.functionRole ?? "",
            answers: stored.answers ?? {},
            startedAt: stored.startedAt ?? Date.now(),
          }
        : current,
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const totalSteps = QUESTION_SCREENS.length + 1;
  const answeredCount = useMemo(
    () => ALL_ITEM_IDS.filter((id) => draft.answers[id] !== undefined).length,
    [draft.answers],
  );
  const progress = Math.round((answeredCount / ALL_ITEM_IDS.length) * 100);

  const screen = step > 0 ? QUESTION_SCREENS[step - 1] : null;

  const profileComplete =
    draft.organization.length > 0 && draft.functionRole.length > 0;

  const screenComplete = screen
    ? screen.items.every((item) => draft.answers[item.id] !== undefined)
    : profileComplete;

  const setAnswer = useCallback((itemId: string, value: number) => {
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, [itemId]: value },
    }));
  }, []);

  const goTo = useCallback((next: number) => {
    setStep(next);
    setShowErrors(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNext = () => {
    if (!screenComplete) {
      setShowErrors(true);
      return;
    }
    goTo(step + 1);
  };

  const handleSubmit = async () => {
    if (!screenComplete) {
      setShowErrors(true);
      return;
    }
    const missing = ALL_ITEM_IDS.filter(
      (id) => draft.answers[id] === undefined,
    );
    if (missing.length > 0) {
      const firstMissingScreen = QUESTION_SCREENS.findIndex((candidate) =>
        candidate.items.some((item) => item.id === missing[0]),
      );
      setError(
        `${missing.length} statement${missing.length === 1 ? "" : "s"} still need${
          missing.length === 1 ? "s" : ""
        } an answer.`,
      );
      setShowErrors(true);
      goTo(firstMissingScreen + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (STATIC_DEMO) {
        const id = submitLocalResponse(
          draft.organization,
          draft.functionRole,
          draft.answers,
        );
        window.localStorage.removeItem(STORAGE_KEY);
        router.push(`/results?id=${id}`);
        return;
      }
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: draft.organization,
          functionRole: draft.functionRole,
          durationSec: Math.max(
            0,
            Math.round((Date.now() - draft.startedAt) / 1000),
          ),
          answers: draft.answers,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Submission failed.");
      }

      const { id } = (await response.json()) as { id: string };
      window.localStorage.removeItem(STORAGE_KEY);
      router.push(`/results/${id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setDraft({ ...emptyDraft, startedAt: Date.now() });
    goTo(0);
  };

  if (!hydrated) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-sm text-muted">
          Loading the assessment…
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader
        right={
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Start over
          </button>
        }
      />

      <div ref={topRef} />

      <div className="sticky top-0 z-10 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted">
            <span>
              Step {step + 1} of {totalSteps}
              {screen ? ` · ${screen.pillarLabel}` : " · About you"}
            </span>
            <span>
              {answeredCount} of {ALL_ITEM_IDS.length} answered
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-accent-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {step === 0 ? (
          <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold text-brand-900">About you</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              These two answers are the only things recorded alongside your
              responses. They let management compare companies and functions —
              they cannot identify you.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="organization"
                  className="block text-sm font-medium text-brand-900"
                >
                  Which organisation do you belong to?
                </label>
                <select
                  id="organization"
                  value={draft.organization}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      organization: event.target.value,
                    }))
                  }
                  className={`mt-2 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${
                    showErrors && !draft.organization
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                >
                  <option value="">Choose your organisation</option>
                  {ORGANIZATIONS.map((organization) => (
                    <option key={organization} value={organization}>
                      {organization}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="functionRole"
                  className="block text-sm font-medium text-brand-900"
                >
                  Choose your cross-functional role
                </label>
                <select
                  id="functionRole"
                  value={draft.functionRole}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      functionRole: event.target.value,
                    }))
                  }
                  className={`mt-2 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${
                    showErrors && !draft.functionRole
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                >
                  <option value="">Choose your cross-functional role</option>
                  {FUNCTION_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showErrors && !profileComplete ? (
              <p className="mt-4 text-sm font-medium text-red-600">
                Please choose both your organisation and your role.
              </p>
            ) : null}
          </section>
        ) : screen ? (
          <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
              {screen.pillarLabel}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-brand-900">
              {screen.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Indicate how much you agree with each statement.
            </p>

            <ol className="mt-8 space-y-8">
              {screen.items.map((item, index) => {
                const value = draft.answers[item.id];
                const unanswered = showErrors && value === undefined;
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-4 transition ${
                      unanswered
                        ? "border-red-300 bg-red-50/40"
                        : "border-slate-200"
                    }`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
                      {item.categoryLabel} · {item.subDimensionLabel}
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-ink">
                      <span className="mr-2 text-sm font-semibold text-muted">
                        {index + 1}.
                      </span>
                      {item.text}
                    </p>

                    <fieldset className="mt-4">
                      <legend className="sr-only">{item.text}</legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                        {SCALE_OPTIONS.map((option) => {
                          const selected = value === option.value;
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-center transition ${
                                selected
                                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={item.id}
                                value={option.value}
                                checked={selected}
                                onChange={() => setAnswer(item.id, option.value)}
                                className="sr-only"
                              />
                              <span className="text-sm font-semibold">
                                {option.value}
                              </span>
                              <span className="text-[11px] leading-tight">
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </li>
                );
              })}
            </ol>

            {showErrors && !screenComplete ? (
              <p className="mt-6 text-sm font-medium text-red-600">
                Please answer every statement on this page before continuing.
              </p>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step === 0 ? (
            <Link
              href="/"
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              Back
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              Previous
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-accent-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit and see my results"}
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Your progress is saved in this browser only. Nothing is sent until you
          submit.
        </p>
      </main>
    </>
  );
}
