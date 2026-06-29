# IT Value Bridge — Pilot Readiness Checklist

Internal operations reference for the IT Value Bridge pilot deployment.
Use this before any demo, handover, or stakeholder review.

---

## 1. Required Environment Variables

Set these in Vercel (Project → Settings → Environment Variables) **or** in a `.env` file for local/on-prem deployment.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon for demo; local Docker for on-prem) |
| `AUTH_SECRET` | ✅ | Auth.js session secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_DEMO_MODE` | ⚠️ | Set `"true"` on the hosted demo instance; `"false"` for real bank deployment |
| `ENABLE_AI_NARRATIVE` | ⚠️ | Set `"false"` (default) — no Claude API calls at runtime; flip to `"true"` when API key is added |
| `NEXT_PUBLIC_WORKSPACE_NAME` | ⚠️ | Shown in sidebar — e.g. `"Bandhan Bank — IT Value Bridge Pilot"` |

**Template:** copy `.env.example` to `.env` and fill in values.

---

## 2. Database Status

### Hosted demo (Vercel + Neon)
- Database: Neon free tier, AWS Singapore (`ap-southeast-1`), database `neondb`
- Migrations run automatically via `prisma migrate deploy` on every Vercel build
- Seeded with 22 sample initiatives, 4 demo users, 6 OKRs, 5 demands

### On-prem (Docker)
- Run: `docker compose up -d` (starts local PostgreSQL)
- Apply migrations: `npm run db:deploy`
- Seed sample data: `npm run db:seed`

### Useful Prisma commands
```bash
npx prisma migrate deploy   # Apply pending migrations (production)
npx prisma migrate dev      # Apply migrations in development (with generation)
npx prisma generate         # Regenerate Prisma client after schema changes
npx prisma studio           # Visual DB browser at localhost:5555
```

---

## 3. Seed Command

```bash
# Full seed (22 initiatives, demo users, OKRs, demands, dependencies)
npm run db:seed

# Admin-only targeted seed (creates org + admin@bank.com)
DATABASE_URL="<neon-url>" npx tsx scripts/seed-admin.ts
```

**Demo credentials (all use password `Demo@1234!`):**

| Email | Role | Name | Notes |
|---|---|---|---|
| `admin@bank.com` | ADMIN | Platform Admin | Workspace Settings, user mgmt |
| `cio@bank.com` | CIO | Mahesh Iyer | Executive Value Command Center |
| `pmo@bank.com` | PMO | Anita Desai | PMO Governance Control Tower |
| `vh@bank.com` | Vertical Head | Rajesh Kumar | Digital Banking vertical |
| `vh2@bank.com` | Vertical Head | Priya Sharma | Retail Assets vertical |
| `business@bank.com` | Business SPOC | Anil Kumar | Digital Products |
| `business2@bank.com` | Business SPOC | Deepa Nair | Retail Lending |

> ⚠️ These are demo credentials. In production, force password reset on first login.

---

## 4. Build Command

```bash
# Production build (runs prisma migrate deploy first)
npm run build

# Local development
npm run dev

# Lint
npm run lint

# Deploy migrations only
npm run db:deploy
```

The `postinstall` hook runs `prisma generate` automatically on every `npm install`.

### Vercel build pipeline (automatic)
1. `npm install` → triggers `postinstall: prisma generate`
2. `npm run build` → runs `prisma migrate deploy && next build`
3. Deploy to Vercel CDN

---

## 5. Known Production Limitations

| # | Limitation | Status |
|---|---|---|
| 1 | Single-organisation workspace — no multi-tenant isolation | Schema ready (`organizationId`), enforcement pending |
| 2 | Credential login only — no SSO/SAML/LDAP | Auth.js supports it; config change required |
| 3 | AI narrative is rule-based — no LLM output | Block ready; Claude API key enables it |
| 4 | PDF export via browser print | Server-side PDF pipeline planned |
| 5 | No Jira/ServiceNow/email integrations | On roadmap |
| 6 | Docker on-prem bundle incomplete | `output: standalone` + app service in docker-compose pending |
| 7 | Mobile experience limited | Desktop-first; mobile polish planned |
| 8 | Not yet externally validated with real bank users | Bandhan Bank pilot is next step |

See `/admin/known-limitations` for full details with roadmap paths.

---

## 6. Demo User Credentials Location

**Live demo (Vercel):** https://it-value-bridge.vercel.app/sign-in
- Credentials are visible on the sign-in page when `NEXT_PUBLIC_DEMO_MODE=true`
- All accounts use password: `Demo@1234!`

**Vercel environment variables:** Vercel Dashboard → Project → Settings → Environment Variables
- `DATABASE_URL` — Neon connection string (sensitive; cannot be copied from UI)
- `AUTH_SECRET` — Session signing secret

**Local `.env`:** `D:\Claude_Project Tracker\.env` (gitignored — never commit)

---

## 7. Rollback Plan

### Vercel (hosted demo)
1. Go to Vercel Dashboard → Deployments
2. Find the last known-good deployment
3. Click **⋯ → Promote to Production**
4. Deployment rolls back in ~30 seconds

### Database (Neon)
- Neon free tier does not support point-in-time recovery
- If a migration breaks data: restore from the last manual seed (`npm run db:seed`)
- Breaking schema changes: revert the migration file and push a new commit

### Code rollback
```bash
git revert HEAD          # Revert last commit (creates a new commit)
git push origin main     # Triggers automatic Vercel redeploy
```

> ⚠️ Never force-push `main` — Vercel deploys from `main` automatically.

---

## 8. Vercel Deployment Notes

- **Auto-deploy:** Every push to `main` triggers a Vercel production build
- **Build time:** ~45–60 seconds
- **Migrations:** `prisma migrate deploy` runs as part of `npm run build`
- **Env vars:** Set in Vercel Dashboard; sensitive vars cannot be copied from UI after creation
- **Domain:** `it-value-bridge.vercel.app` (free Hobby tier)
- **Region:** Vercel Edge (global CDN) + Neon PostgreSQL (AWS ap-southeast-1)

### Pre-demo checklist
- [ ] Verify Vercel deployment shows ✅ **Ready** in Deployments tab
- [ ] Sign in as `cio@bank.com` and confirm CIO dashboard loads
- [ ] Sign in as `pmo@bank.com` and confirm PMO Work Queue shows data
- [ ] Sign in as `admin@bank.com` and confirm Admin Console shows Pilot Readiness passing
- [ ] Test "Export CSV" on the Leadership Value Report
- [ ] Test "Export as PDF" (browser print preview)
- [ ] Clear browser cache / use incognito for the demo

---

## 9. Support & Escalation

- **Code repository:** https://github.com/Anit0607/it-value-bridge (public)
- **Live demo:** https://it-value-bridge.vercel.app
- **Admin console:** https://it-value-bridge.vercel.app/admin (ADMIN role required)
- **Pilot Readiness:** https://it-value-bridge.vercel.app/admin/pilot-readiness
- **Known Limitations:** https://it-value-bridge.vercel.app/admin/known-limitations

---

*Last updated: June 2026 · IT Value Bridge v0.1.0 Pilot*
