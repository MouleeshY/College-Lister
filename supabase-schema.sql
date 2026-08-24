-- ============================================================
-- PhD Dossier — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------- Schools (main tracker) ----------------
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  status text default 'Researching',
  deadline text,
  application_link text,
  prospective_advisors text,
  fee text,
  gre text,
  gre_institution_code text,
  recommendation_1 text,
  recommendation_2 text,
  recommendation_3 text,
  faculty_notified text default 'No',
  fellowship text,
  stipend_ay text,
  stipend_summer text,
  stipend_total text,
  insurance text,
  additional_info text,
  booked text default 'No',
  confirmation text,
  decision text default 'No',
  visit_days text,
  visit_website text,
  visit_rsvp text,
  visit_rsvp_deadline text,
  reimbursement text,
  hotel text,
  flight_in text,
  score_academic int check (score_academic between 1 and 5),
  score_funding int check (score_funding between 1 and 5),
  score_admissions int check (score_admissions between 1 and 5),
  score_career int check (score_career between 1 and 5),
  score_environment int check (score_environment between 1 and 5),
  score_personal int check (score_personal between 1 and 5),
  detail_notes text,
  created_at timestamptz default now()
);

-- ---------------- Recommenders ----------------
create table if not exists recommenders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- ---------------- Application materials ----------------
-- One row per section (Statement of Purpose, Honors, etc.)
create table if not exists application_materials (
  id uuid primary key default gen_random_uuid(),
  section text not null unique,
  content text default '',
  updated_at timestamptz default now()
);

insert into application_materials (section, content) values
  ('Statement of Purpose', ''),
  ('Academic honors', ''),
  ('Publications', ''),
  ('Research experience', ''),
  ('Teaching experience', ''),
  ('Work experience', ''),
  ('Grading system reference', 'A 4.0 | A- 3.7 | B+ 3.3 | B 3.0 | B- 2.7 | C+ 2.3 | C 2.0 | C- 1.7 | D 1.0 | F 0')
on conflict (section) do nothing;

-- ---------------- Seed: NTU (from your research so far) ----------------
insert into schools (
  name, country, status, deadline, application_link, prospective_advisors,
  fee, gre, gre_institution_code, faculty_notified, fellowship,
  stipend_ay, stipend_summer, stipend_total, insurance, additional_info,
  score_academic, score_funding, score_admissions, score_career, score_environment, score_personal,
  detail_notes
) values (
  'NTU', 'Singapore', 'Researching',
  'Oct 1 – Jan 31 (Aug intake) / Jun 1 – Jul 31 (Jan intake)',
  'TBD', 'TBD — identify via NTU EEE faculty directory',
  'TBD', 'GRE ≥319 or GATE ≥90th pct (required)', 'TBD', 'No',
  'NTU Research Scholarship / SINGA / NPGS',
  'S$2,700–4,300/mo depending on award',
  'Included (12-mo stipend, no separate summer gap)',
  'S$32,400–51,600/yr depending on award',
  'Mandatory university-subsidized health insurance',
  'On-campus housing ~S$500-800/mo; food ~S$400-600/mo',
  5, 5, 4, 5, 5, 4,
  'Top 10 globally for EEE (QS/US News). Research pillars: Microelectronics/Photonics/IC Design, Power & Smart Grids, Communications/Signal Processing/AI, Control/Robotics. 4-yr guaranteed funding, no service bond. Direct-entry PhD standard after Bachelor''s. Heavy industry partnerships (TSMC, GlobalFoundries, STMicroelectronics, Synopsys).'
);

-- ============================================================
-- Row Level Security
-- This app has no login screen — it uses the public anon key
-- directly, so anyone with the URL + anon key can read/write.
-- Fine for a private personal tool; do NOT use this policy if
-- you plan to share the link publicly. Add Supabase Auth first
-- if you need real access control.
-- ============================================================
alter table schools enable row level security;
alter table recommenders enable row level security;
alter table application_materials enable row level security;

create policy "anon full access - schools" on schools
  for all using (true) with check (true);

create policy "anon full access - recommenders" on recommenders
  for all using (true) with check (true);

create policy "anon full access - materials" on application_materials
  for all using (true) with check (true);
