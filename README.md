# JCorp AI Readiness Assessment

An anonymous questionnaire that benchmarks JCorp group leaders on AI readiness, plus a
password-protected management dashboard that compares companies and cross-functional functions.

Structured on the two pillars of the McKinsey *AI Individual & Organizational Assessment*:

| Pillar | Categories | Sub-dimensions | Statements |
|---|---|---|---|
| Personal readiness | Enablers, Fluency, Intention | 13 | 26 |
| Organizational readiness | Strategy, Workflows, Talent, Structure, Leadership, Culture and skills, HR and talent system | 9 | 18 |
| **Total** | **10** | **22** | **44** |

Each statement is rated on a 6-point agreement scale with no neutral midpoint. A full sitting takes
about 12 minutes.

---

## Quick start

Requires Node.js 20 or later.

```powershell
cd ai-readiness
npm install                 # also runs `prisma generate`
Copy-Item .env.example .env # then edit the secrets, see below
npm run db:migrate          # creates prisma/dev.db
npm run seed                # optional: 260 synthetic responses so the dashboard has data
npm run dev                 # http://localhost:3000
```

For a production-style run:

```powershell
npm run build
npm run start               # set $env:PORT to change the port
```

### Environment variables

Everything lives in `.env` (never committed). `.env.example` is the template.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database connection. `file:./prisma/dev.db` for local SQLite. |
| `ADMIN_PASSWORD` | Shared password for `/admin`. **Change this before anyone uses the app.** |
| `SESSION_SECRET` | Signs the admin session cookie. Use a long random string; changing it signs everyone out. |
| `NEXT_PUBLIC_MIN_SEGMENT_SIZE` | Minimum responses before a segment's scores are shown. Default `3`. |

---

## How people use it

| Route | Who | What it does |
|---|---|---|
| `/` | Respondent | Purpose, time estimate, anonymity statement. |
| `/assess` | Respondent | Organization + cross-functional role, then 7 short question screens. The draft is kept in `localStorage`, so a refresh or a closed tab does not lose answers. Nothing is written to the database until submit. |
| `/results/[id]` | Respondent | Own scores immediately after submitting: overall index and band, personal vs organizational split, a radar across the ten categories overlaid on the JCorp average, and sub-dimension bars. Prints cleanly to PDF. |
| `/admin/login` | Management | Shared-password gate. |
| `/admin` | Management | The benchmark dashboard. |

The dashboard carries: response and coverage KPIs, a company × category (or sub-dimension) heatmap,
a radar comparing up to four segments, a league table, group strengths and gaps, the largest positive
and negative deviations from the group average (one entry per segment, tagged Company or Function), a
score distribution histogram, a response coverage matrix, and a CSV export. Filters cover organization,
function, date range, straight-lined responses and demo data.

---

## Scoring

1. Each raw answer (1–6) is normalised to a 0–100 index: `(raw − 1) ÷ 5 × 100`.
2. **Sub-dimension** = mean of its 2 statements.
3. **Category** = mean of its sub-dimensions.
4. **Pillar** = unweighted mean of *all* sub-dimensions in that pillar, so a category is not
   over-weighted just because it holds fewer sub-dimensions.
5. **Overall readiness index** = mean of the two pillar scores.

Scores are always recomputed on the server from the raw answers; the client's numbers are never trusted.

| Index | Band |
|---|---|
| 0–39 | Nascent |
| 40–54 | Emerging |
| 55–69 | Developing |
| 70–84 | Advanced |
| 85–100 | Leading |

A submission where every answer is identical is flagged as straight-lined and can be excluded from the
dashboard with a filter toggle.

---

## Anonymity

- No name, email, IP address or user agent is stored — only organization, cross-functional role,
  timestamps, duration and the answers.
- The results URL uses a random id that is not linked to any identity.
- Any segment with fewer than `NEXT_PUBLIC_MIN_SEGMENT_SIZE` responses is suppressed in the dashboard
  and labelled "insufficient responses", so a cell like "Head of Company at Waqaf" cannot resolve to
  one identifiable person.

The trade-off: there is no way to stop someone submitting twice, and no way to track who has responded.
If response-rate tracking becomes necessary, the cleanest addition is single-use invite codes stored in
a separate table from the answers.

---

## Changing the content

Everything editable lives in `src/config/` — no other code needs to change.

| To change | Edit |
|---|---|
| Organizations | `ORGANIZATIONS` in `src/config/segments.ts` |
| Cross-functional roles | `FUNCTION_ROLES` in `src/config/segments.ts` |
| Statement wording, categories, sub-dimensions | `FRAMEWORK` in `src/config/framework.ts` |
| Response scale labels | `SCALE_OPTIONS` in `src/config/framework.ts` |
| Readiness bands | `READINESS_BANDS` in `src/config/framework.ts` |
| How questions are split across screens | `SCREEN_PLAN` in `src/config/framework.ts` |

Brand colours and typography are CSS variables at the top of `src/app/globals.css`; drop in the JCorp
palette and a logo there.

`npm test` guards the framework's integrity — item counts, unique ids, and the rule that a question
screen never mixes pillars — so a bad edit fails fast.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm run start` | Production build and server |
| `npm test` | Unit tests for scoring, aggregation and framework integrity |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run seed` | Purge demo rows, then generate 260 synthetic responses (`npm run seed -- 500` for a different count) |
| `npm run seed:purge` | Delete demo rows only, leaving real responses untouched |
| `npm run purge:test` | Delete non-demo rows — use after the smoke test or screenshot script |

Two developer utilities are not wired into npm scripts:

```powershell
node scripts\smoke.mjs http://localhost:3100 changeme   # 37 end-to-end checks against a running server
node scripts\shots.mjs http://localhost:3100 changeme shots  # screenshots via installed MS Edge
```

Both submit real (non-demo) responses, so follow them with `npm run purge:test`.

---

## Project layout

```
ai-readiness/
├─ prisma/schema.prisma            Response + Answer models (no PII)
├─ src/config/framework.ts         pillars, categories, sub-dimensions, 44 items, bands, screens
├─ src/config/segments.ts          organizations, roles, minimum segment size
├─ src/lib/scoring.ts              normalisation, roll-ups, banding, aggregation, suppression
├─ src/lib/dashboard.ts            builds the management dashboard payload
├─ src/lib/auth.ts                 signed admin session cookie
├─ src/lib/prisma.ts               Prisma client singleton + SQLite adapter
├─ src/app/                        landing, assess, results, admin, API routes
├─ src/components/                 charts, heatmap, score dials, chip selects
└─ scripts/                        seed, purge, smoke test, screenshots
```

---

## Deploying beyond the laptop

The SQLite file is local-only. For a real rollout:

1. Change the `datasource` provider in `prisma/schema.prisma` to `postgresql` or `sqlserver`, point
   `DATABASE_URL` at the managed database, and swap the adapter in `src/lib/prisma.ts`
   (`@prisma/adapter-pg` or the equivalent). Then `npx prisma migrate deploy`.
2. Containerise and host on Azure App Service or Container Apps.
3. Move `ADMIN_PASSWORD` and `SESSION_SECRET` into Azure Key Vault — or, better, replace the shared
   password with Entra ID sign-in restricted to the management group. The password gate is deliberately
   simple and is the weakest part of the system.
4. Serve over HTTPS; the session cookie is already `HttpOnly` and `SameSite=Lax`, and sets `Secure` in
   production.

---

## Before this goes to leaders

- **Review the statement wording.** The 44 statements are original prose written to reflect the
  framework's sub-dimensions — they are not copied from McKinsey's proprietary instrument. Adjust the
  phrasing to JCorp language and have the sponsor sign it off.
- **Change `ADMIN_PASSWORD` and `SESSION_SECRET`.**
- **Clear the demo data** with `npm run seed:purge` before real responses are collected, or the
  benchmark will be meaningless.
- **Decide the minimum segment size.** The default of 3 is low; consider 5 for a group this size.
