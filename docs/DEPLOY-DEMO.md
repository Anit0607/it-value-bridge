# Deploy the shareable demo (Vercel + Neon)

A free, public demo link for evaluation and feedback — **dummy data only**.
The real bank deployment stays on-prem (Docker); this is a separate, cloud-hosted
copy of the *same code* so people can try it from any browser with no install.

> ⚠️ This instance must hold **sample data only**. It carries a "Demo environment"
> badge. Never enter real customer or bank data here.

---

## What you'll create (all free, ~15–20 min)

| Account | Used for | Sign in with |
|---|---|---|
| **GitHub** | stores the code | email |
| **Neon** | free Postgres database | "Continue with GitHub" |
| **Vercel** | runs the app, gives the link | "Continue with GitHub" |

---

## Step 1 — Put the code on GitHub

1. Create a new **private** repo on GitHub (e.g. `it-value-bridge`).
2. From the project folder, push it:
   ```bash
   git remote add origin https://github.com/<you>/it-value-bridge.git
   git push -u origin master
   ```

## Step 2 — Create the database (Neon)

1. At neon.tech, create a project → name the database `itvb`.
2. Copy the **Pooled connection string** (Neon → Connect → "Pooled connection").
   It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/itvb?sslmode=require`

## Step 3 — Load the schema + demo data into Neon (one time)

From the project folder, point at Neon and run the migration + seed:
```bash
# PowerShell
$env:DATABASE_URL = "<your Neon pooled string>"
npx prisma migrate deploy
npm run db:seed
```
Expected: tables created, then "Seeded 4 users, 20 initiatives, 5 demands, 5 dependencies".
*(I can run this for you if you paste me the Neon string — it's a fresh demo DB.)*

## Step 4 — Deploy on Vercel

1. At vercel.com → **Add New → Project** → import the GitHub repo.
2. Before clicking Deploy, add these **Environment Variables**:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon pooled string |
   | `AUTH_SECRET` | output of `openssl rand -base64 32` (or any 32+ random chars) |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` |
   | `ENABLE_AI_NARRATIVE` | `false` |

3. Click **Deploy**. After ~2 minutes you get a link like
   `https://it-value-bridge.vercel.app`.

## Step 5 — Share it

Send testers the link + logins (password for all: `Demo@1234!`):

- CIO view — `cio@bank.com`
- PMO — `pmo@bank.com`
- Vertical Head — `vh@bank.com`
- Business — `business@bank.com`

The sign-in page also has one-click demo buttons that pre-fill these.

---

## Updating the demo after feedback

Make changes → commit → `git push`. Vercel **auto-redeploys** the same link.
No need to touch anything else. (The Docker bundle, when built, uses the same
code — you only develop once.)

## Good to know

- **First visit may take ~20–30s** while the free tier wakes up — normal.
- All testers share **one instance**, so they see each other's changes (fine for a group walkthrough).
- To reset the demo data: re-run `npm run db:seed` against the Neon string.
- This cloud demo does **not** change the production story: real bank use = the
  on-prem Docker bundle, data never leaves their premises.
