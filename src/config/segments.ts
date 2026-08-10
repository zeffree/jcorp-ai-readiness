/**
 * JCorp AI Readiness Assessment — segmentation options.
 *
 * These are the only attributes collected about a respondent. Editing this file
 * is all that is required to add, rename or remove a company or function.
 */

export const ORGANIZATIONS = [
  "JCorp",
  "KPJ",
  "JPG",
  "JLG",
  "QSR",
  "Waqaf",
  "Kulim",
  "JCG",
  "Yayasan JCorp",
] as const;

export type Organization = (typeof ORGANIZATIONS)[number];

export const FUNCTION_ROLES = [
  "Head of Company",
  "Strategy",
  "Finance",
  "People / HR",
  "Digital",
  "Operations",
  "Procurement / Supply Chain",
  "Governance / Risk",
  "Sales and Marketing",
  "Investment",
  "Corporate Services",
] as const;

export type FunctionRole = (typeof FUNCTION_ROLES)[number];

/**
 * Minimum number of responses a segment must contain before its scores are
 * shown. Protects respondent anonymity in small cells such as a single
 * "Head of Company" within one operating company.
 */
export const MIN_SEGMENT_SIZE = Number(
  process.env.NEXT_PUBLIC_MIN_SEGMENT_SIZE ?? 3,
);
