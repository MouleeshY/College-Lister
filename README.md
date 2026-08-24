# The PhD Dossier

A small tracker for comparing PhD programs — schools, funding, deadlines, recommenders,
and application materials — with an auto-scoring dashboard that highlights your best-fit
school. Plain HTML/CSS/JS, no build step, backed by Supabase.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project dashboard, go to **SQL Editor → New query**, paste in the contents of
   `supabase-schema.sql`, and run it. This creates the `schools`, `recommenders`, and
   `application_materials` tables, seeds them with the NTU research you already gathered,
   and sets up permissive Row Level Security policies (see security note below).
3. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

Run the schema script once for a new project. It includes a sample NTU row and
permissive policies for this no-login prototype; do not rerun it on a populated
project without reviewing the seed and policy statements.

## 2. Configure the app

Open `config.js` and paste in your values:

```js
export const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

## 3. Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. In the repo, go to **Settings → Pages**, set the source to your default branch (root),
   and save.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within a
   minute or two.

No build step, no dependencies to install — it's static files pulling Supabase and
Chart.js from a CDN at runtime.

## AI field report (optional)

The Dashboard recommendation action calls the `rank-schools` Supabase Edge Function;
the Gemini key is never placed in the browser. Install the Supabase CLI, then deploy
the function and set its secret:

```sh
supabase functions deploy rank-schools
supabase secrets set GEMINI_API_KEY=your-gemini-key
```

The rest of the dossier works without the function. A clear status message appears if
Supabase is not configured, the function is not deployed, or Gemini is unavailable.
The function accepts requests from the GitHub Pages site and the local development
server; update its allowlist if you use a different hosting origin.

## Using it

- **Schools** — click any card to edit it, or "+ Add school" for a new one. Fill in the
  six 1–5 scores yourself based on your research; the total and the "best fit" flag
  update automatically.
- **Dashboard** — a live comparison: total-score bar chart (best school in green),
  a category breakdown chart, and a ledger table.
- **Recommenders** — same fields as your original tracker template.
- **Materials** — plaintext sections (Statement of Purpose, honors, publications,
  research/teaching/work experience) for fast copy-paste into application portals.

## Security note

This app has no login screen — it talks to Supabase directly with the public anon key,
which is visible in the deployed JS. The SQL schema grants that anon key full read/write
access to all three tables. That's fine for a private tool only you know the URL to, but:

- **Don't share the link publicly** as-is — anyone with it can read and edit your data.
- If you want real access control, add [Supabase Auth](https://supabase.com/docs/guides/auth)
  (email/password or magic link) and change the RLS policies to check `auth.uid()`
  instead of `using (true)`.

## Adding more schools

Just click "+ Add school" and fill in the modal — no code changes needed. Everything
(cards, dashboard charts, best-fit flag) recalculates from what's in Supabase.
