# Plan: notes for Claude

A private, single-user planning PWA (plan.dunwell.co). See README.md for setup and the API table.

## Isolation rules (non-negotiable)

This app lives inside the **Sensei production Supabase project** (`dywrisybvcorpfhbwgtg`). Sensei's data is in `public`.

- Every table, trigger, function and migration this app creates goes in the `plan` schema. Never read, write, alter or migrate `public` or any other schema.
- Migration files must not contain the string `public.`. Check with `git grep -n "public\." supabase/`, which must return nothing.
- The browser never talks to Supabase. All data access goes through `/api/*` functions using the service-role key, which exists only in Vercel env. Never ship a Supabase key or URL to the client bundle, and never add `VITE_SUPABASE_*` vars.
- Every `plan` table has RLS enabled with **no policies**, and `anon`/`authenticated` have all privileges revoked. New tables must do the same and be granted to `service_role` only.
- The supabase-js client is created only in `api/_lib/db.ts`, with `db: { schema: 'plan' }`.

## Stack

- `src/`: React 18 + TypeScript + Tailwind 3. It uses a tiny pushState router (`src/lib/router.ts`), not react-router. Pages: `Login`, `Projects` (home), `Board` (`/p/:id`).
- `api/`: Vercel Node functions. `api/_lib/` holds shared code (the underscore keeps it from being routed). Use `.js` extensions in relative imports (NodeNext).
  - `http.ts`: the `route()` wrapper (re-checks the session, dispatches by method, returns JSON errors), plus `check()` for Supabase results.
  - `validate.ts`: all input validation (enums, lengths, dates). Validate every field server-side.
  - `types.ts`: row types and the `Database` type for supabase-js. The frontend re-exports these from `src/types.ts`.
- `middleware.ts`: Edge middleware password gate. Public paths: `/login`, `/api/login`, `/index.html`, `/assets/*`, `/icons/*`, manifest, service worker, `robots.txt`, favicons. Without a valid cookie, pages redirect to `/login?next=…` and `/api/*` returns 401.
- Session cookie `plan_session` = `hex(HMAC-SHA256(PLAN_SECRET, issuedAt)).issuedAt`, HttpOnly, Secure, SameSite=Strict, 90 days. `api/_lib/session.ts` uses Web Crypto only, so it runs in both Edge and Node.
- PWA: `vite.config.ts`. The shell is precached; `GET /api/*` is network-first (cache `plan-api`), so the last-viewed state is readable offline.

## Schema (`plan`)

- `projects(id, name, target_date, summary, tracks text[] (ordered), archived, created_at, updated_at)`
- `items(id, project_id → projects cascade, track, title, owner default 'William', due, status ∈ not_started|in_progress|done|at_risk, notes, sort_order, completed_at, created_at, updated_at)`
- `log(id, project_id → projects cascade, item_id → items set null, body, created_at)`
- Triggers: `updated_at = now()` on update; `completed_at` is set when status becomes `done` and cleared otherwise.

New migrations go in `supabase/migrations/NNN_*.sql`, are applied by hand in the Supabase SQL editor, and must follow the isolation rules above.

## Design

Subway-board style, following the system theme. Archivo for text, IBM Plex Mono for dates and counts. 3px rule under the page header, 2px under track heads, 1px hairlines between rows. No shadows, no rounded cards, and no gradients except the half-filled in-progress circle. Tap targets are at least 44px.

- Track colours cycle: `#0039A6 #996633 #FF6319 #B933AD #6CBE45 #00933C #00A1DE #808183`.
- Status colours: done `#00933C`, in progress `#E8A400`, at risk `#EE352E`, not started gray outline.
- Theme tokens are CSS variables in `src/index.css`, mapped to Tailwind colours in `tailwind.config.js`.

## Checks before pushing

`npm run build` (typechecks both the app and the API, then builds) and `git grep -n "public\." supabase/`.
