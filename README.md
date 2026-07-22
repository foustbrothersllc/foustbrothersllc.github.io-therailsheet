# Rail Sheet

Real-time yard operations app. Next.js 14 (App Router) + Tailwind + Supabase
(Auth, Postgres, Realtime, Presence) + Gemini API for CSV/Excel import.

## What's included

```
src/
  app/
    login/                 sign in
    register/               sign up (employee ID, matching password)
    pending/                 "pending approval" + Having Trouble form
    dashboard/                driver view — mobile-first At Rail / Departed
    admin/                    admin view — desktop-optimized wide grid
    api/gemini-validate/       Gemini-backed CSV/XLSX smart-mapping route
  components/                 all UI: cards, modals, sidebar, import flow
  hooks/                      useAuth, useTrailers (realtime), usePresence
  lib/
    supabase/                 browser + server + admin (service_role) clients
    types.ts, utils.ts
  middleware.ts                session refresh + route protection
supabase/schema.sql             full DB schema, RLS policies, first-admin bootstrap
```

## 1. Create the Supabase project

1. Go to supabase.com → New project. Note the project URL and anon key
   (Project Settings → API).
2. Open the SQL Editor and run the entire contents of `supabase/schema.sql`.
   This creates the `profiles`, `trailers`, and `signup_problems` tables,
   RLS policies, the auto-profile-on-signup trigger, and turns on Realtime
   for `trailers` and `profiles`.

## 2. Get a Gemini API key

Go to Google AI Studio (aistudio.google.com) → Get API key. The free tier
is enough for CSV validation traffic at small-yard scale.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase
  Project Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — same page, "service_role" secret. **Never**
  expose this to the browser; it's only read inside `src/app/api/**` route
  handlers, which run server-side.
- `GEMINI_API_KEY` — from AI Studio.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## 5. Create your account and make yourself admin

1. Go to `/register` and sign up. You'll land on `/pending` — this is
   expected, every new account starts unapproved.
2. In the Supabase SQL Editor, run (swap in your email):

   ```sql
   update public.profiles
   set is_approved = true, is_admin = true
   where email = 'you@example.com';
   ```

3. Refresh — you'll be dropped into `/dashboard`, and the shield icon
   (top right) will take you to `/admin`. From there, approve everyone
   else through the Users sidebar (no more manual SQL needed).

## 6. Deploy

Push to GitHub, import into Vercel, add the same four env vars in the
Vercel project settings, deploy. No build-time config changes needed.

## Notes on how a few things work

- **Realtime handoff**: accepting a trailer is a single guarded update
  (`status = 'at_rail'` in the `WHERE` clause), so if two drivers tap
  "Accept" on the same card within the same second, only the first write
  wins — the second gets a friendly "already taken" error instead of a
  silent overwrite.
- **Departed auto-clear**: rows older than 12 hours are filtered out
  client-side (`useTrailers` hook) — they stay in the database
  permanently, they just stop showing in the UI.
- **CSV import**: files are parsed in the browser (`xlsx` package handles
  both .csv and .xlsx), then the raw rows are sent to
  `/api/gemini-validate`, which prompts Gemini to smart-map arbitrary
  column names onto the trailer schema, standardize equipment numbers,
  and flag missing required fields. The API route re-checks required
  fields server-side too, so a bad model response can't sneak incomplete
  rows through. Import uses `upsert` on `equipment_number`, so re-running
  an import with corrected rows won't create duplicates.
- **Presence**: the green "Active Now" dot in the admin Users sidebar
  comes from a Supabase Presence channel each logged-in client joins on
  mount and leaves on unmount/tab close.
