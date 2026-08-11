# Self-hosting guide

How to take this project and run it on your own infrastructure — your own GitHub organisation, your
own Azure subscription (or another host), your own database.

This is written for someone who has *not* seen the project before. Follow it top to bottom and you
will end up with a working, private deployment.

---

## Contents

1. [What you are deploying](#1-what-you-are-deploying)
2. [Prerequisites](#2-prerequisites)
3. [Import the code](#3-import-the-code)
4. [Run it locally](#4-run-it-locally)
5. [Make it yours](#5-make-it-yours)
6. [Deploy to Azure App Service](#6-deploy-to-azure-app-service)
7. [Deploy somewhere else](#7-deploy-somewhere-else)
8. [Go-live checklist](#8-go-live-checklist)
9. [Day-two operations](#9-day-two-operations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What you are deploying

A single Next.js application with three surfaces:

| Route | Audience | Purpose |
|---|---|---|
| `/` and `/assess` | Every leader | 44-statement AI readiness questionnaire |
| `/results/[id]` | The respondent | Their own scores against the group average |
| `/admin` | Management | Password-protected benchmark dashboard |

### Architecture

```mermaid
flowchart LR
    U[Leaders' browsers] -->|HTTPS| A[Next.js app<br/>server-rendered + API routes]
    M[Management] -->|HTTPS + password| A
    A -->|Prisma + pg over TLS| D[(PostgreSQL)]
```

There is no separate API service, no queue, no cache and no object storage. Two moving parts: **the
web app** and **a PostgreSQL database**. That is deliberate — it keeps hosting cheap and the failure
modes obvious.

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, server components) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Database | PostgreSQL 17 |
| Validation | Zod |
| Tests | Vitest |

### Data model

Two tables, no personally identifying information. A `Response` row holds the organisation, the
cross-functional role, timing metadata and the computed scores; `Answer` rows hold one 1–6 value per
statement. Nothing links a response to a person.

---

## 2. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| [Node.js](https://nodejs.org) | 20 LTS or newer (24 recommended) | Everything |
| npm | Ships with Node | Everything |
| [Git](https://git-scm.com) | any recent | Cloning |
| PostgreSQL | 14+ | Local development, if not using a hosted DB |
| [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) | 2.60+ | Only for the Azure path |

Check what you have:

```powershell
node -v; npm -v; git --version; az version
```

You do **not** need Docker, and you do **not** need the Azure Developer CLI (`azd`).

---

## 3. Import the code

### Option A — fork or clone into your own GitHub organisation (recommended)

```powershell
# Requires the GitHub CLI: https://cli.github.com
gh repo clone <current-owner>/jcorp-ai-readiness
cd jcorp-ai-readiness

# Point it at your own private repo instead
git remote remove origin
gh repo create <your-org>/ai-readiness --private --source . --remote origin --push
```

### Option B — start a clean history

Useful if you want the code without the original commit history.

```powershell
gh repo clone <current-owner>/jcorp-ai-readiness ai-readiness
cd ai-readiness
Remove-Item -Recurse -Force .git
git init -b main
git add -A
git commit -m "Import AI readiness assessment"
gh repo create <your-org>/ai-readiness --private --source . --remote origin --push
```

### Option C — download a zip

Use GitHub's **Code → Download ZIP**, extract it, then `git init` as in Option B.

> **Keep the repository private.** It contains no secrets, but it does contain your assessment
> instrument and organisation list.

---

## 4. Run it locally

### 4.1 Install dependencies

```powershell
npm install
```

`postinstall` runs `prisma generate` automatically, which writes the typed client into
`src/generated/prisma/`.

### 4.2 Provide a database

The app is PostgreSQL-only. Prisma cannot switch database providers at runtime, so there is no
SQLite fallback.

Pick one:

- **Local PostgreSQL** — install it, then `createdb airreadiness`.
- **A cloud database** — Azure Database for PostgreSQL, Neon, Supabase, Amazon RDS. Any PostgreSQL 14+
  works. Point local development straight at a dev database in the cloud if you would rather not
  install anything.

### 4.3 Configure the environment

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

| Variable | What to put in it |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/airreadiness?schema=public` — append `&sslmode=verify-full` for a managed cloud database |
| `ADMIN_PASSWORD` | The shared password for `/admin` |
| `SESSION_SECRET` | A long random string; it signs the admin cookie |

Generate strong values:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

`.env` is gitignored. Never commit it.

### 4.4 Create the schema

```powershell
npx prisma migrate deploy
```

Use `npm run db:migrate` instead if you are actively changing `prisma/schema.prisma` and want a new
migration generated.

### 4.5 Optional: load demo data

```powershell
npm run seed          # 520 synthetic responses
npm run seed -- 700   # a different volume
```

This makes the dashboard look like a live rollout so you can evaluate it properly. Every generated
row is flagged `isDemo = true`, so it can be removed cleanly later:

```powershell
npm run seed:purge    # deletes demo rows only, leaves real responses alone
```

### 4.6 Start it

```powershell
npm run dev
```

Open <http://localhost:3000>. The dashboard is at `/admin`, using your `ADMIN_PASSWORD`.

### 4.7 Verify

```powershell
npm test                                              # 23 unit tests
npm run lint
npx tsc --noEmit
node scripts\smoke.mjs http://localhost:3000 <ADMIN_PASSWORD>   # 37 end-to-end checks
npm run purge:test                                    # remove the row the smoke test created
```

---

## 5. Make it yours

Everything worth editing sits in `src/config/`. No other code needs to change.

| To change | Edit |
|---|---|
| Companies / business units | `ORGANIZATIONS` in `src/config/segments.ts` |
| Cross-functional roles | `FUNCTION_ROLES` in `src/config/segments.ts` |
| Statement wording, categories, sub-dimensions | `FRAMEWORK` in `src/config/framework.ts` |
| Response scale labels | `SCALE_OPTIONS` in `src/config/framework.ts` |
| Readiness bands and thresholds | `READINESS_BANDS` in `src/config/framework.ts` |
| How questions are split across screens | `SCREEN_PLAN` in `src/config/framework.ts` |
| Brand colours, fonts | CSS variables at the top of `src/app/globals.css` |
| Product name, footer | `src/components/AppHeader.tsx`, `src/app/layout.tsx` |

`npm test` enforces the framework's integrity — item counts, unique ids, and the rule that a single
question screen never mixes the personal and organisational pillars — so a careless edit fails fast
rather than silently skewing scores.

> **On segment visibility:** every segment with at least one response is scored and displayed; there
> is no minimum-response threshold. A segment is blank only when nobody in it has responded. `n` is
> printed beside every segment — read thin segments accordingly. To reintroduce a threshold, add the
> guard back to `aggregate()` in `src/lib/scoring.ts`.

---

## 6. Deploy to Azure App Service

This is the proven path. Roughly 15 minutes, about **USD 28/month** on the sizes below.

The app ships as a **pre-built Next.js standalone bundle**. App Service runs `node server.js`; it does
not build anything. That keeps deployments fast and predictable.

### 6.1 Set your variables

```powershell
az login
az account set --subscription "<YOUR SUBSCRIPTION NAME OR ID>"

$rg       = "rg-ai-readiness"
$region   = "southeastasia"          # pick a region near your users
$suffix   = -join ((97..122) | Get-Random -Count 6 | ForEach-Object {[char]$_})
$pg       = "psql-airead-$suffix"    # must be globally unique
$app      = "ai-readiness-$suffix"   # must be globally unique
$plan     = "asp-airead"
$dbname   = "airreadiness"
$dbuser   = "aireadadmin"
$dbpass   = -join ((1..24) | ForEach-Object { (([char[]]'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789') | Get-Random) })
$adminpw  = -join ((1..18) | ForEach-Object { (([char[]]'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789') | Get-Random) })
$secret   = node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Keep these somewhere safe — outside the repo.
@{ dbpass = $dbpass; adminpw = $adminpw; sessionsecret = $secret } |
  ConvertTo-Json | Set-Content "$env:TEMP\airead-secrets.json"
```

### 6.2 Create the resource group and database

```powershell
az group create -n $rg -l $region

az postgres flexible-server create `
  -g $rg -n $pg -l $region `
  --admin-user $dbuser --admin-password $dbpass `
  --tier Burstable --sku-name Standard_B1ms `
  --storage-size 32 --version 17 `
  --backup-retention 7 --public-access None --yes

# The database must be created separately.
az postgres flexible-server db create -g $rg -s $pg -n $dbname
```

> **CLI quirks that will bite you.** `--database-name` on `flexible-server create` is silently
> rejected unless `--node-count` is also present (elastic clusters only), so create the database with
> its own command. On `db create`, `-n` is the *database* name. On the firewall commands below, the
> server is `-s`/`--server-name` and `-n` is the *rule* name. Always read the full CLI output —
> truncating it hides silent failures.

### 6.3 Open the firewall

```powershell
# Let Azure services (your web app) reach the server.
az postgres flexible-server firewall-rule create `
  -g $rg -s $pg -n AllowAzureServices `
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Let your own machine reach it, for migrations and seeding.
$myip = (Invoke-RestMethod https://api.ipify.org)
az postgres flexible-server firewall-rule create `
  -g $rg -s $pg -n AllowMyMachine `
  --start-ip-address $myip --end-ip-address $myip

az postgres flexible-server firewall-rule list -g $rg -s $pg -o table
```

### 6.4 Migrate and seed from your machine

```powershell
$dburl = "postgresql://${dbuser}:${dbpass}@${pg}.postgres.database.azure.com:5432/${dbname}?sslmode=verify-full"
Set-Content .env "DATABASE_URL=`"$dburl`"`nADMIN_PASSWORD=`"$adminpw`"`nSESSION_SECRET=`"$secret`""

npx prisma migrate deploy
npm run seed        # optional demo data
```

> Pin `sslmode=verify-full`, not `require`. `pg` v8+ treats `require` as `verify-full` anyway and
> warns about it; being explicit removes the warning. It validates fine against Azure's DigiCert chain.

### 6.5 Create the web app

```powershell
az appservice plan create -g $rg -n $plan --is-linux --sku B1
az webapp create -g $rg -p $plan -n $app --runtime "NODE:22-lts"
```

### 6.6 Configure it

```powershell
az webapp config appsettings set -g $rg -n $app --settings `
  DATABASE_URL="$dburl" `
  ADMIN_PASSWORD="$adminpw" `
  SESSION_SECRET="$secret" `
  WEBSITES_PORT=8080 `
  SCM_DO_BUILD_DURING_DEPLOYMENT=false

az webapp update -g $rg -n $app --https-only true
az webapp config set -g $rg -n $app --always-on true
```

Secrets live in App Service configuration only. They are never in the repo and never in the zip.

### 6.7 Build, package and deploy

```powershell
npm run build     # produces .next/standalone
npm run package   # assembles and zips dist/app.zip

az webapp deploy -g $rg -n $app --src-path dist\app.zip --type zip
```

**Now — and only now — set the startup command:**

```powershell
az webapp config set -g $rg -n $app --startup-file "node server.js"
az webapp restart -g $rg -n $app
```

> **Order matters.** Setting the startup command before any code exists guarantees one container that
> exits with code 1. App Service staples the *most recent* container error onto the current deployment
> status, so that dead container makes a perfectly healthy deploy report `FailedInstances: 1` and time
> out after ten minutes. Deploy the code first.

`npm run package` (see `scripts/package.mjs`) does four things that a plain `next build` does not:

1. Copies `.next/static` and `public/` into the standalone output, which Next leaves behind.
2. **Deletes the `.env` file Next copies into the bundle**, so secrets never ship.
3. Rewrites the standalone `package.json` start script to `node server.js`.
4. Strips Windows and macOS native binaries from `node_modules/@img` so a Windows build does not ship
   `sharp-win32-x64.node` to a Linux host.

### 6.8 Verify

```powershell
$url = "https://$app.azurewebsites.net"
curl.exe -s -o NUL -w "%{http_code} %{time_total}s`n" $url
node scripts\smoke.mjs $url $adminpw
npm run purge:test
Write-Output "Live at $url — admin password: $adminpw"
```

A healthy deployment reports `"status": "RuntimeSuccessful"` with `numberOfInstancesFailed: 0` and
finishes in roughly three minutes, including a 50–70 second startup probe.

---

## 7. Deploy somewhere else

Nothing here is Azure-specific. The app is a standard Next.js server plus a PostgreSQL connection
string.

### Vercel, Netlify, Render, Railway

1. Connect the repository.
2. Build command `npm run build`, install command `npm install`.
3. Set `DATABASE_URL`, `ADMIN_PASSWORD` and `SESSION_SECRET` as environment variables.
4. Run `npx prisma migrate deploy` once against the production database.

Remove `output: "standalone"` from `next.config.ts` on platforms that prefer a normal build — it is
only there to produce a self-contained zip for App Service.

### Docker

There is no Dockerfile in the repo, but the standalone output makes one trivial:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
```

Pass `DATABASE_URL`, `ADMIN_PASSWORD` and `SESSION_SECRET` at runtime. Never bake them into the image.

### Fully on-premises

Node 22 and PostgreSQL 17 behind your existing reverse proxy. Run `npm run build`, then
`npm run start` under a process manager such as systemd or PM2. Terminate TLS at the proxy.

---

## 8. Go-live checklist

Work through this before sending the link to real leaders.

- [ ] **Review the questionnaire with the sponsor.** The 44 statements are original prose written
      around the McKinsey AI Individual & Organizational Assessment's structure. They are not
      McKinsey's licensed instrument. Confirm the wording and the framing are what your organisation
      wants to ask, and clear any attribution with whoever owns that relationship.
- [ ] **Set your own organisation list and roles** in `src/config/segments.ts`.
- [ ] **Apply your brand** in `src/app/globals.css`.
- [ ] **Change `ADMIN_PASSWORD`** from anything that has been shared in chat, email or a ticket.
- [ ] **Set a fresh `SESSION_SECRET`.** Rotating it signs every admin out.
- [ ] **Purge demo data:** `npm run seed:purge`. Otherwise 520 synthetic responses will contaminate
      your first real benchmark.
- [ ] **Restrict the database firewall.** Remove any broad rule; keep only Azure services and the
      addresses you actually need.
- [ ] **Confirm HTTPS-only** is enabled.
- [ ] **Decide on stronger authentication.** A shared password is the weakest link in this design —
      see below.
- [ ] **Agree a data-retention position** with whoever owns privacy in your organisation, and make
      sure the anonymity statement on `/` matches what you actually do.
- [ ] **Take a backup** and confirm you can restore it.

### Replacing the password gate with Entra ID

The single shared password is the most likely thing you will want to change. On Azure the cheapest
upgrade is built-in authentication, which requires no application code:

```powershell
az webapp auth microsoft update -g $rg -n $app `
  --client-id <APP REGISTRATION CLIENT ID> `
  --client-secret <SECRET> `
  --tenant-id <TENANT ID> `
  --yes
az webapp auth update -g $rg -n $app --enabled true --action RedirectToLoginPage
```

Note that this protects the *whole site*, including the questionnaire. If you want anonymous
responses but authenticated management, keep the app anonymous and instead place the `/admin` route
behind a separate front door, or add a group-membership check inside `src/lib/auth.ts`.

---

## 9. Day-two operations

### Redeploy after a change

```powershell
npm test; npx tsc --noEmit; npm run lint
npm run build
npm run package
az webapp deploy -g $rg -n $app --src-path dist\app.zip --type zip
```

The startup command persists — you only set it once.

### Read the current admin password

```powershell
az webapp config appsettings list -g $rg -n $app `
  --query "[?name=='ADMIN_PASSWORD'].value | [0]" -o tsv
```

### Rotate the admin password

```powershell
$new = -join ((1..18) | ForEach-Object { (([char[]]'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789') | Get-Random) })
az webapp config appsettings set -g $rg -n $app --settings ADMIN_PASSWORD="$new"
Write-Output "New admin password: $new"
```

### Export the data

Sign in to `/admin` and use the CSV export, or query the database directly. The export contains no
personally identifying information.

### Watch the logs

```powershell
az webapp log tail -g $rg -n $app
```

### Back up and restore

Azure Database for PostgreSQL Flexible Server takes automatic backups with the retention you set at
creation (7 days above). To restore:

```powershell
az postgres flexible-server restore -g $rg -n "$pg-restored" --source-server $pg `
  --restore-time "2026-01-01T00:00:00Z"
```

### Scale up

`B1` is fine for a few hundred respondents. For a large simultaneous launch:

```powershell
az appservice plan update -g $rg -n $plan --sku P0V3
az postgres flexible-server update -g $rg -n $pg --tier GeneralPurpose --sku-name Standard_D2ds_v4
```

The Prisma pool is capped at 5 connections in `src/lib/prisma.ts`, sized for a Burstable database.
Raise it if you move to a larger tier.

### Tear it all down

```powershell
az group delete -n $rg --yes --no-wait
```

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `The Driver Adapter @prisma/adapter-pg is not compatible with the provider sqlite` | You changed the datasource but did not regenerate. Run `npx prisma generate`. |
| Deploy reports "site failed to start within 10 mins" but the site works | A stale container error from before the code was uploaded. Confirm with `az webapp log deployment show`; look for `State: Started` with an empty `LastError`. Deploy code before setting the startup command. |
| App starts locally but 500s on the host | `DATABASE_URL` missing or unreachable. Check the app settings and the database firewall. |
| `no pg_hba.conf entry for host` | The host's outbound IP is not allowed. Add a firewall rule, or enable the Azure services rule. |
| `self signed certificate in certificate chain` | Your database uses a private CA. Either add the CA or, for a trusted managed service, keep `sslmode=verify-full`. |
| Charts render but scores are all zero | The database has responses but no answers. Re-run the seed, or check that submissions are completing. |
| Blank page, `Cannot find module './server.js'` | The zip was built without `npm run package`. `.next/static` and `public/` were not copied in. |
| `sharp` errors mentioning `win32` on a Linux host | The bundle was built on Windows without the packaging step. Run `npm run package`, which strips foreign binaries. |
| Everything is slow on first load after idle | Always-on is off, so the app cold-starts. `az webapp config set -g $rg -n $app --always-on true`. |

### Getting more detail

```powershell
az webapp log deployment show -g $rg -n $app            # last deployment's logs
az webapp show -g $rg -n $app --query state -o tsv      # Running / Stopped
az webapp config show -g $rg -n $app --query appCommandLine -o tsv   # startup command
```

---

## Licence and attribution note

The assessment structure is inspired by publicly described McKinsey work on AI readiness. The
statements in `src/config/framework.ts` are original wording, not a licensed reproduction of any
McKinsey instrument. Before publishing results externally or attributing the framework to McKinsey,
clear it with whoever owns that relationship in your organisation.
