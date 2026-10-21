# Plan

A private planning tool at **plan.dunwell.co**, for one user. Each plan is a **project** with ordered tracks, items (status, owner, due date, notes) and a notes & resources log. It's a mobile-first PWA that installs to the iPhone home screen.

- **Frontend:** Vite + React + TypeScript + Tailwind, `vite-plugin-pwa`
- **API:** Vercel serverless functions in `/api`, using the Supabase service-role key (only in Vercel env)
- **Auth:** one password, checked by Vercel Edge Middleware (`middleware.ts`) via an HMAC-signed `plan_session` cookie valid for 90 days
- **Data:** the existing Sensei Supabase project (`dywrisybvcorpfhbwgtg`), isolated in its own `plan` schema. Nothing in `public` or any other schema is read, written or migrated.

## Setup

### 1. Database (Sensei Supabase project → SQL editor)

1. Run `supabase/migrations/001_plan.sql`. It creates the `plan` schema, the tables and triggers, turns RLS on with no policies, and revokes all access from `anon` and `authenticated`.
2. Run `supabase/seed.sql`. It creates the **Sensei launch** project (target 2026-11-01, 7 tracks) and its items from `supabase/seed-items.json`. It's safe to run again: it does nothing if that project already exists.
3. Go to **Project Settings → Data API → Exposed schemas** and add `plan`. supabase-js needs this to reach the schema. `anon` and `authenticated` still can't read it, because of the revoke and RLS.

Check: with the anon key, `select` on any `plan.*` table fails with `permission denied for schema plan`.

### 2. Vercel

1. Import the repo as a new Vercel project. The framework preset is Vite; `vercel.json` sets the build.
2. Set these environment variables (see `.env.example`):

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://dywrisybvcorpfhbwgtg.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Sensei project service-role key |
   | `PLAN_PASSWORD` | the login password |
   | `PLAN_SECRET` | `openssl rand -base64 32` |

   Changing `PLAN_SECRET` signs every device out.
3. Add the domain `plan.dunwell.co` to the project.

### 3. DNS

Add a `CNAME` record for `plan` pointing at `cname.vercel-dns.com` (or whatever target Vercel shows for the domain).

### 4. iPhone

Open `https://plan.dunwell.co` in Safari, log in, then Share → **Add to Home Screen**.

## Development

```sh
npm install
npm run build      # typecheck (app + api) and production build
vercel dev         # full stack locally (middleware + /api), needs the env vars above
```

`npm run dev` runs Vite alone. To use it against a running `vercel dev`, start it with `PLAN_API=http://localhost:3000 npm run dev`.

- `npm run seed:gen` regenerates `supabase/seed.sql` from `supabase/seed-items.json`.
- `npm run icons:gen` regenerates the PWA icons in `public/` (pure Node, no dependencies).

## API

All endpoints take and return JSON, and all except login need the session cookie.

| Method | Path | |
| --- | --- | --- |
| POST | `/api/login` | `{password}` → sets cookie. Limited to 10 attempts per IP per 15 min |
| POST | `/api/logout` | clears the cookie |
| GET | `/api/projects` | projects with `counts`, `open`, `done`, `next_item` |
| POST | `/api/projects` | `{name, target_date, tracks}` or `{name, target_date, duplicate_from}` |
| GET | `/api/projects/:id` | `{project, items, log}` |
| PATCH | `/api/projects/:id` | `{name?, target_date?, summary?, archived?, tracks?, renames?: [{from,to}]}` |
| DELETE | `/api/projects/:id` | deletes the project and its items and log (cascade) |
| POST | `/api/items` | `{project_id, track, title, owner?, due?, status?, notes?}` |
| PATCH | `/api/items/:id` | any of `title, track, owner, due, status, notes, sort_order` |
| DELETE | `/api/items/:id` | |
| POST | `/api/log` | `{project_id, body, item_id?}` |
| DELETE | `/api/log/:id` | |
| GET | `/api/export/:id` | whole project as a JSON download |

Removing a track that still has items returns `409`. Renaming a track (via `renames`) moves its items with it.
