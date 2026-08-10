/**
 * End-to-end smoke test against a running server.
 * Usage: node scripts/smoke.mjs http://localhost:3100 <adminPassword>
 */

const base = process.argv[2] ?? "http://localhost:3100";
const password = process.argv[3] ?? "changeme";

let failures = 0;
function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`${status}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const { ALL_ITEM_IDS } = await import("./items.mjs");

// 1. Public pages render
for (const path of ["/", "/assess", "/admin/login"]) {
  const response = await fetch(`${base}${path}`);
  check(`GET ${path}`, response.ok, `status ${response.status}`);
}

// 2. Submitting an incomplete response is rejected
const partial = await fetch(`${base}/api/responses`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organization: "KPJ",
    functionRole: "Digital",
    answers: { [ALL_ITEM_IDS[0]]: 5 },
  }),
});
check("POST /api/responses rejects incomplete answers", partial.status === 400);

// 3. Submitting an unknown organisation is rejected
const badOrg = await fetch(`${base}/api/responses`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organization: "Not A Company",
    functionRole: "Digital",
    answers: Object.fromEntries(ALL_ITEM_IDS.map((id) => [id, 5])),
  }),
});
check("POST /api/responses rejects unknown organisation", badOrg.status === 400);

// 4. Out-of-range values are rejected
const badValue = await fetch(`${base}/api/responses`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organization: "KPJ",
    functionRole: "Digital",
    answers: Object.fromEntries(ALL_ITEM_IDS.map((id) => [id, 9])),
  }),
});
check("POST /api/responses rejects out-of-range values", badValue.status === 400);

// 5. A complete submission succeeds and scores correctly
const answers = Object.fromEntries(
  ALL_ITEM_IDS.map((id) => [id, id.startsWith("P-") ? 6 : 1]),
);
const submit = await fetch(`${base}/api/responses`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    organization: "KPJ",
    functionRole: "Digital",
    durationSec: 640,
    answers,
  }),
});
check("POST /api/responses accepts a complete submission", submit.status === 201);
const { id } = await submit.json();
check("submission returns an id", typeof id === "string" && id.length > 0);

// 6. Results page renders and shows the expected split
const results = await fetch(`${base}/results/${id}`);
const resultsHtml = await results.text();
check("GET /results/[id]", results.ok, `status ${results.status}`);
check(
  "results show personal 100.0 and organizational 0.0",
  resultsHtml.includes("100.0") && resultsHtml.includes("0.0"),
);
check("results page shows the respondent's segment", resultsHtml.includes("KPJ"));

// 7. Unknown result id 404s
const missing = await fetch(`${base}/results/does-not-exist`);
check("GET /results/unknown returns 404", missing.status === 404);

// 8. Public stats endpoint exposes only group aggregates
const stats = await (await fetch(`${base}/api/stats`)).json();
check("GET /api/stats returns a group average", typeof stats.overall === "number");
check("GET /api/stats has no per-segment data", !("byOrganization" in stats));

// 9. Admin endpoints refuse anonymous access
const unauthorisedStats = await fetch(`${base}/api/admin/stats`);
check("GET /api/admin/stats is protected", unauthorisedStats.status === 401);
const unauthorisedExport = await fetch(`${base}/api/admin/export`);
check("GET /api/admin/export is protected", unauthorisedExport.status === 401);
const adminRedirect = await fetch(`${base}/admin`, { redirect: "manual" });
check(
  "GET /admin redirects to login when signed out",
  adminRedirect.status === 307 || adminRedirect.status === 302,
  `status ${adminRedirect.status}`,
);

// 10. Wrong password is rejected
const badLogin = await fetch(`${base}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "definitely-wrong" }),
});
check("POST /api/admin/login rejects a wrong password", badLogin.status === 401);

// 11. Correct password issues a session
const login = await fetch(`${base}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});
check("POST /api/admin/login accepts the configured password", login.ok);
const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
check("login sets a session cookie", cookie.startsWith("jcorp_admin="));

// 12. Dashboard data loads and is internally consistent
const dashboard = await (
  await fetch(`${base}/api/admin/stats`, { headers: { cookie } })
).json();
check("GET /api/admin/stats returns data", dashboard.totals.responses > 0);
check(
  "dashboard covers every company and function",
  dashboard.organizations.length === 9 && dashboard.functions.length === 11,
);
check("dashboard exposes 10 categories", dashboard.categories.length === 10);
check("dashboard exposes 22 sub-dimensions", dashboard.subDimensions.length === 22);

const coverageTotal = dashboard.coverage.reduce((sum, row) => sum + row.total, 0);
check(
  "coverage matrix totals match the response count",
  coverageTotal === dashboard.totals.responses,
  `${coverageTotal} vs ${dashboard.totals.responses}`,
);

const orgTotal = dashboard.byOrganization.reduce(
  (sum, entry) => sum + entry.aggregate.n,
  0,
);
check(
  "organisation segments total the response count",
  orgTotal === dashboard.totals.responses,
  `${orgTotal} vs ${dashboard.totals.responses}`,
);

const functionTotal = dashboard.byFunction.reduce(
  (sum, entry) => sum + entry.aggregate.n,
  0,
);
check(
  "function segments total the response count",
  functionTotal === dashboard.totals.responses,
  `${functionTotal} vs ${dashboard.totals.responses}`,
);

const distributionTotal = dashboard.distribution.reduce(
  (sum, bucket) => sum + bucket.personal,
  0,
);
check(
  "distribution totals the response count",
  distributionTotal === dashboard.totals.responses,
  `${distributionTotal} vs ${dashboard.totals.responses}`,
);

check(
  "suppressed segments never leak scores",
  dashboard.byOrganization
    .concat(dashboard.byFunction)
    .filter((entry) => entry.aggregate.suppressed)
    .every((entry) => entry.aggregate.overall === 0),
);
check(
  "every segment below the minimum is suppressed",
  dashboard.byOrganization
    .concat(dashboard.byFunction)
    .every(
      (entry) =>
        entry.aggregate.n >= dashboard.minSegmentSize ||
        entry.aggregate.suppressed,
    ),
);

// 13. Filtering narrows the dataset
const filtered = await (
  await fetch(`${base}/api/admin/stats?organization=KPJ`, {
    headers: { cookie },
  })
).json();
check(
  "filtering by organisation narrows the dataset",
  filtered.totals.responses > 0 &&
    filtered.totals.responses < dashboard.totals.responses,
);
check(
  "filtered dataset contains only the chosen organisation",
  filtered.byOrganization
    .filter((entry) => entry.label !== "KPJ")
    .every((entry) => entry.aggregate.n === 0),
);

// 14. CSV export matches the dashboard
const exportResponse = await fetch(`${base}/api/admin/export`, {
  headers: { cookie },
});
check("GET /api/admin/export succeeds when signed in", exportResponse.ok);
const csv = await exportResponse.text();
const lines = csv.trim().split("\r\n");
check(
  "CSV row count matches the dashboard response count",
  lines.length - 1 === dashboard.totals.responses,
  `${lines.length - 1} vs ${dashboard.totals.responses}`,
);
const headerCells = lines[0].replace(/^\uFEFF/, "").split(",");
check(
  "CSV carries all 22 sub-dimension and 44 item columns",
  headerCells.filter((cell) => cell.startsWith("sub_")).length === 22 &&
    headerCells.filter((cell) => cell.startsWith("item_")).length === 44,
);
check(
  "CSV contains no name or email column",
  !headerCells.some((cell) => /name|email|ip_/i.test(cell)),
);

// 15. Admin page renders when signed in
const adminPage = await fetch(`${base}/admin`, { headers: { cookie } });
check("GET /admin renders when signed in", adminPage.ok);

// 16. Sign out invalidates the session
await fetch(`${base}/api/admin/logout`, { method: "POST", headers: { cookie } });

console.log(
  failures === 0
    ? "\nAll smoke checks passed."
    : `\n${failures} smoke check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
