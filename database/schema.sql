-- =====================================================================
-- Kamgar: Supabase schema
-- Run this whole file once in the Supabase dashboard: SQL Editor > New query > Run.
-- It is safe to run again: tables use IF NOT EXISTS, policies/triggers are replaced.
--
-- Contents
--   0. Extensions
--   1. Accounts: profiles (role), worker/contractor profiles, documents
--   2. Work: sites, jobs, applications, attendance
--   3. Live day-of workflow: shifts, events, breaks, proof photos
--   4. Money: payments
--   5. Reviews (two-sided, hidden until both sides submit or 45 days pass)
--   6. Notifications
--   7. Helper functions, guard triggers, views
--   8. Row level security policies
--   9. Storage buckets and policies
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 7a. Helper functions (defined first because policies use them)
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. Accounts
-- ---------------------------------------------------------------------

-- One row per auth user. The role is chosen at sign-up and can never be changed by the user.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('contractor', 'worker')),
  full_name   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Worker profile: what contractors can see (WorkerProfile in data/types.ts).
create table if not exists public.worker_profiles (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  onboarded      boolean not null default false,
  phone_verified boolean not null default false,
  area           text not null default '',
  native_place   text not null default '',
  skill          text not null default '',
  other_skills   text[] not null default '{}',
  experience     int  not null default 0 check (experience >= 0),
  languages      text[] not null default '{}',
  rate           int  not null default 0 check (rate >= 0),
  availability   text not null default 'now' check (availability in ('now', 'week', 'later')),
  about          text not null default '',
  photo_path     text,                       -- path in the public-media bucket
  updated_at     timestamptz not null default now()
);

-- Worker details only the worker and contractors they work with may read.
create table if not exists public.worker_private (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  phone           text not null default '',
  birth_year      int check (birth_year between 1900 and 2100),
  emergency_name  text not null default '',
  emergency_phone text not null default '',
  upi             text not null default '',
  updated_at      timestamptz not null default now()
);

create table if not exists public.worker_works (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  skill       text not null default '',
  area        text not null default '',
  year        int  not null,
  description text not null default '',
  images      text[] not null default '{}',  -- paths in the public-media bucket
  ref_name    text,
  ref_phone   text,
  created_at  timestamptz not null default now()
);
create index if not exists worker_works_worker_idx on public.worker_works(worker_id);

create table if not exists public.worker_references (
  id         uuid primary key default gen_random_uuid(),
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  relation   text not null default '',
  phone      text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists worker_references_worker_idx on public.worker_references(worker_id);

-- Contractor business profile (ContractorProfile).
create table if not exists public.contractor_profiles (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  onboarded         boolean not null default false,
  phone_verified    boolean not null default false,
  company           text not null default '',
  kind              text not null default 'firm' check (kind in ('individual', 'firm', 'company')),
  years_in_business int  not null default 0 check (years_in_business >= 0),
  team_size         text not null default '6-20',
  city              text not null default '',
  areas             text[] not null default '{}',
  trades            text[] not null default '{}',
  about             text not null default '',
  logo_path         text,
  pledge            boolean not null default false,   -- fair-pay pledge
  updated_at        timestamptz not null default now()
);

-- Contractor details only the contractor and workers they hired may read.
create table if not exists public.contractor_private (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  phone          text not null default '',
  office_address text not null default '',
  gst            text not null default '',
  upi            text not null default '',
  updated_at     timestamptz not null default now()
);

-- Uploaded identity / business / skill documents. Only the owner sees the file;
-- everyone signed in can see the verification status through document_status.
create table if not exists public.profile_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('idProof', 'skillCert', 'police', 'ownerId', 'business')),
  status      text not null default 'review' check (status in ('review', 'verified')),
  file_name   text not null,
  file_path   text not null,                 -- path in the private documents bucket
  id_number   text,                          -- stored masked, e.g. XXXX XXXX 1234
  uploaded_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (user_id, kind)
);

-- ---------------------------------------------------------------------
-- 2. Work
-- ---------------------------------------------------------------------

create table if not exists public.sites (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  area          text not null default '',
  address       text not null default '',
  kind          text not null default 'residential' check (kind in ('residential', 'commercial', 'industrial', 'other')),
  contact_name  text not null default '',
  contact_phone text not null default '',
  amenities     text[] not null default '{}'
                check (amenities <@ array['water','toilet','firstAid','helmets','meals','shade','transport']),
  photos        text[] not null default '{}',  -- paths in the public-media bucket
  created_at    timestamptz not null default now()
);
create index if not exists sites_contractor_idx on public.sites(contractor_id);

create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  site_id       uuid references public.sites(id) on delete set null,
  title         text not null,
  skill         text not null,
  area          text not null default '',
  address       text not null default '',
  needed        int  not null check (needed > 0),
  pay_type      text not null check (pay_type in ('daily', 'hourly', 'fixed')),
  amount        int  not null check (amount >= 0),
  start_date    date not null,
  end_date      date not null,
  report_time   time not null default '08:00',
  shift_hours   int  not null default 8 check (shift_hours between 1 and 16),
  closed        boolean not null default false,
  posted_on     date not null default current_date,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists jobs_contractor_idx on public.jobs(contractor_id);
create index if not exists jobs_open_idx on public.jobs(closed, end_date);

create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs(id) on delete cascade,
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  applied_on date not null default current_date,
  unique (job_id, worker_id)
);
create index if not exists applications_worker_idx on public.applications(worker_id);

-- Attendance mark per worker per day: P present, H half day, A absent.
create table if not exists public.attendance (
  job_id    uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  day       date not null,
  mark      text not null check (mark in ('P', 'H', 'A')),
  marked_by uuid references public.profiles(id),
  primary key (job_id, worker_id, day)
);

-- ---------------------------------------------------------------------
-- 3. Live day-of workflow
-- ---------------------------------------------------------------------

create table if not exists public.shifts (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  worker_id       uuid not null references public.profiles(id) on delete cascade,
  day             date not null default current_date,
  status          text not null default 'scheduled'
                  check (status in ('scheduled','on_the_way','arrived','working','break','done','approved','disputed')),
  journey_at      timestamptz,
  journey_ms      bigint,
  distance_km     numeric(6,1),
  arrived_at      timestamptz,
  check_in_at     timestamptz,
  check_out_at    timestamptz,
  late_min        int,
  worker_note     text,
  decision_mark   text check (decision_mark in ('P', 'H', 'A')),
  decision_at     timestamptz,
  decision_hours  numeric(4,1),
  decision_note   text,
  dispute_reason  text,
  dispute_at      timestamptz,
  dispute_reply   text,
  updated_at      timestamptz not null default now(),
  unique (job_id, worker_id, day)
);
create index if not exists shifts_worker_idx on public.shifts(worker_id, day);

create table if not exists public.shift_events (
  id       bigint generated always as identity primary key,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  type     text not null check (type in ('journey_started','arrived','checked_in','break_started','break_ended','proof_added','checked_out','approved','disputed','resubmitted')),
  at       timestamptz not null default now(),
  note     text
);
create index if not exists shift_events_shift_idx on public.shift_events(shift_id);

create table if not exists public.shift_breaks (
  id       bigint generated always as identity primary key,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz
);
create index if not exists shift_breaks_shift_idx on public.shift_breaks(shift_id);

create table if not exists public.shift_proofs (
  id         uuid primary key default gen_random_uuid(),
  shift_id   uuid not null references public.shifts(id) on delete cascade,
  kind       text not null check (kind in ('before', 'during', 'after')),
  photo_path text not null,                  -- path in the public-media bucket
  caption    text not null default '',
  at         timestamptz not null default now()
);
create index if not exists shift_proofs_shift_idx on public.shift_proofs(shift_id);

-- ---------------------------------------------------------------------
-- 4. Money
-- ---------------------------------------------------------------------

create table if not exists public.payments (
  job_id       uuid not null references public.jobs(id) on delete cascade,
  worker_id    uuid not null references public.profiles(id) on delete cascade,
  amount       int  not null check (amount >= 0),
  paid_on      date not null default current_date,
  mode         text not null check (mode in ('Cash', 'UPI', 'Bank')),
  confirmed    boolean not null default false,   -- worker confirmed receiving it
  confirmed_at timestamptz,
  primary key (job_id, worker_id)
);

-- ---------------------------------------------------------------------
-- 5. Reviews
-- ---------------------------------------------------------------------

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs(id) on delete cascade,
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('contractor', 'worker')),   -- which side wrote it
  author_id  uuid not null references public.profiles(id) on delete cascade,
  from_name  text not null default '',
  rating     int  not null check (rating between 1 and 5),
  criteria   int[] not null check (array_length(criteria, 1) = 3 and criteria <@ array[1,2,3,4,5]),
  comment    text not null default '',
  created_on date not null default current_date,
  unique (job_id, worker_id, author_role)
);
create index if not exists reviews_worker_idx on public.reviews(worker_id);

-- ---------------------------------------------------------------------
-- 6. Notifications
-- ---------------------------------------------------------------------

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- recipient
  key        text not null,                    -- English message with {placeholders}
  vars       jsonb not null default '{}',
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 7b. More helper functions (SECURITY DEFINER so policies do not recurse)
-- ---------------------------------------------------------------------

create or replace function public.is_job_contractor(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = j and contractor_id = auth.uid())
$$;

create or replace function public.is_hired(j uuid, w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where job_id = j and worker_id = w and status = 'accepted')
$$;

-- Has this contractor accepted this worker for any of their jobs?
create or replace function public.is_hired_by(c uuid, w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where j.contractor_id = c and a.worker_id = w and a.status = 'accepted')
$$;

-- Do these two accounts have any application between them (either direction)?
create or replace function public.shares_job(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications ap join public.jobs j on j.id = ap.job_id
    where (j.contractor_id = a and ap.worker_id = b) or (j.contractor_id = b and ap.worker_id = a))
$$;

-- Is the signed-in user the worker or the contractor of this shift?
create or replace function public.shift_participant(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shifts sh join public.jobs j on j.id = sh.job_id
    where sh.id = s and (sh.worker_id = auth.uid() or j.contractor_id = auth.uid()))
$$;

create or replace function public.job_ended(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = j and (closed or end_date < current_date))
$$;

-- A review is public once both sides have submitted, or 45 days after the job ended.
create or replace function public.review_revealed(j uuid, w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(distinct author_role) from public.reviews where job_id = j and worker_id = w) = 2
      or exists (select 1 from public.jobs where id = j and end_date + 45 <= current_date)
$$;

-- Has the other side already reviewed (so submitting unlocks theirs)?
create or replace function public.review_waiting(j uuid, w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.reviews where job_id = j and worker_id = w and author_id <> auth.uid())
     and not exists (select 1 from public.reviews where job_id = j and worker_id = w and author_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- 7c. Triggers
-- ---------------------------------------------------------------------

-- New sign-up: create the profile (role from sign-up metadata) and empty role records.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'worker');
  n text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  if r not in ('contractor', 'worker') then r := 'worker'; end if;
  insert into public.profiles (id, role, full_name) values (new.id, r, n);
  if r = 'worker' then
    insert into public.worker_profiles (user_id) values (new.id);
    insert into public.worker_private (user_id, phone) values (new.id, coalesce(new.raw_user_meta_data->>'phone', ''));
  else
    insert into public.contractor_profiles (user_id) values (new.id);
    insert into public.contractor_private (user_id, phone) values (new.id, coalesce(new.raw_user_meta_data->>'phone', ''));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The role can never be changed from the app.
create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'The account role cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

drop trigger if exists worker_profiles_touch on public.worker_profiles;
create trigger worker_profiles_touch before update on public.worker_profiles for each row execute function public.touch_updated_at();
drop trigger if exists worker_private_touch on public.worker_private;
create trigger worker_private_touch before update on public.worker_private for each row execute function public.touch_updated_at();
drop trigger if exists contractor_profiles_touch on public.contractor_profiles;
create trigger contractor_profiles_touch before update on public.contractor_profiles for each row execute function public.touch_updated_at();
drop trigger if exists contractor_private_touch on public.contractor_private;
create trigger contractor_private_touch before update on public.contractor_private for each row execute function public.touch_updated_at();
drop trigger if exists shifts_touch on public.shifts;
create trigger shifts_touch before update on public.shifts for each row execute function public.touch_updated_at();

-- Documents: users upload as "review"; only an admin (SQL editor / service role) can mark them verified.
create or replace function public.documents_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;   -- SQL editor or service role
  if tg_op = 'INSERT' then
    new.status := 'review'; new.verified_at := null;
  elsif new.status is distinct from old.status or new.verified_at is distinct from old.verified_at then
    raise exception 'Only an administrator can verify documents';
  elsif new.file_path is distinct from old.file_path then
    new.status := 'review';                         -- a replaced file must be checked again
  end if;
  return new;
end $$;
drop trigger if exists documents_guard on public.profile_documents;
create trigger documents_guard before insert or update on public.profile_documents
  for each row execute function public.documents_guard();

-- Applications: contractors may only change the status, and cannot accept beyond the number needed.
create or replace function public.applications_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.status := 'pending'; end if;   -- admins (SQL editor) may insert any status
    return new;
  end if;
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'Only the application status can be changed';
  end if;
  if new.status = 'accepted' and old.status <> 'accepted' then
    select needed into cap from public.jobs where id = new.job_id;
    select count(*) into taken from public.applications where job_id = new.job_id and status = 'accepted';
    if taken >= cap then raise exception 'This job already has all the workers it needs'; end if;
  end if;
  return new;
end $$;
drop trigger if exists applications_guard on public.applications;
create trigger applications_guard before insert or update on public.applications
  for each row execute function public.applications_guard();

-- Shifts: the worker records the day; only the contractor can approve or dispute it.
create or replace function public.shifts_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare keys text[] := array['status','decision_mark','decision_at','decision_hours','decision_note','dispute_reason','dispute_at','updated_at'];
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'scheduled';
    return new;
  end if;
  if auth.uid() = old.worker_id then
    if new.decision_mark is distinct from old.decision_mark or new.decision_at is distinct from old.decision_at
       or new.decision_hours is distinct from old.decision_hours or new.decision_note is distinct from old.decision_note
       or new.dispute_reason is distinct from old.dispute_reason or new.dispute_at is distinct from old.dispute_at
       or (new.status in ('approved', 'disputed') and new.status is distinct from old.status) then
      raise exception 'Only the contractor can approve or dispute a shift';
    end if;
  elsif public.is_job_contractor(old.job_id) then
    if (to_jsonb(new) - keys) is distinct from (to_jsonb(old) - keys) then
      raise exception 'A contractor can only review a shift, not edit it';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists shifts_guard on public.shifts;
create trigger shifts_guard before insert or update on public.shifts
  for each row execute function public.shifts_guard();

-- Payments: the contractor records them; the worker can only confirm receipt.
create or replace function public.payments_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare keys text[] := array['confirmed', 'confirmed_at'];
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.confirmed := false; new.confirmed_at := null;
    return new;
  end if;
  if auth.uid() = old.worker_id then
    if (to_jsonb(new) - keys) is distinct from (to_jsonb(old) - keys) then
      raise exception 'You can only confirm that you received a payment';
    end if;
    if new.confirmed and not old.confirmed then new.confirmed_at := now(); end if;
  elsif new.confirmed is distinct from old.confirmed then
    raise exception 'Only the worker can confirm a payment';
  end if;
  return new;
end $$;
drop trigger if exists payments_guard on public.payments;
create trigger payments_guard before insert or update on public.payments
  for each row execute function public.payments_guard();

-- Reviews: fill in the author and display name from the signed-in account.
create or replace function public.reviews_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- admins (SQL editor) supply these columns themselves
  new.author_id := auth.uid();
  new.author_role := public.app_role();
  new.from_name := coalesce(
    nullif((select company from public.contractor_profiles where user_id = auth.uid()), ''),
    (select full_name from public.profiles where id = auth.uid()), '');
  if new.author_role = 'worker' then
    new.from_name := (select full_name from public.profiles where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists reviews_fill on public.reviews;
create trigger reviews_fill before insert on public.reviews
  for each row execute function public.reviews_fill();

-- ---------------------------------------------------------------------
-- 7d. Views
-- ---------------------------------------------------------------------

-- Verification status of anyone's documents (never the files themselves).
create or replace view public.document_status as
  select user_id, kind, status from public.profile_documents;

-- Public ratings: only reviews that have been revealed.
create or replace view public.worker_ratings as
  select worker_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as review_count
  from public.reviews
  where author_role = 'contractor' and public.review_revealed(job_id, worker_id)
  group by worker_id;

create or replace view public.contractor_ratings as
  select j.contractor_id, round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as review_count,
         round(100.0 * avg((r.criteria[1] >= 4)::int)) as paid_on_time_pct
  from public.reviews r join public.jobs j on j.id = r.job_id
  where r.author_role = 'worker' and public.review_revealed(r.job_id, r.worker_id)
  group by j.contractor_id;

grant select on public.document_status, public.worker_ratings, public.contractor_ratings to authenticated;

-- ---------------------------------------------------------------------
-- 8. Row level security
-- ---------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.worker_profiles     enable row level security;
alter table public.worker_private      enable row level security;
alter table public.worker_works        enable row level security;
alter table public.worker_references   enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.contractor_private  enable row level security;
alter table public.profile_documents   enable row level security;
alter table public.sites               enable row level security;
alter table public.jobs                enable row level security;
alter table public.applications        enable row level security;
alter table public.attendance          enable row level security;
alter table public.shifts              enable row level security;
alter table public.shift_events        enable row level security;
alter table public.shift_breaks        enable row level security;
alter table public.shift_proofs        enable row level security;
alter table public.payments            enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;

-- profiles: names and roles are visible to signed-in users; you edit only your own name.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- worker_profiles: public to signed-in users, edited by the owner.
drop policy if exists "worker_profiles read" on public.worker_profiles;
create policy "worker_profiles read" on public.worker_profiles for select to authenticated using (true);
drop policy if exists "worker_profiles update own" on public.worker_profiles;
create policy "worker_profiles update own" on public.worker_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "worker_private read" on public.worker_private;
create policy "worker_private read" on public.worker_private for select to authenticated
  using (user_id = auth.uid() or (public.app_role() = 'contractor' and public.shares_job(auth.uid(), user_id)));
drop policy if exists "worker_private update own" on public.worker_private;
create policy "worker_private update own" on public.worker_private for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "worker_works read" on public.worker_works;
create policy "worker_works read" on public.worker_works for select to authenticated using (true);
drop policy if exists "worker_works write own" on public.worker_works;
create policy "worker_works write own" on public.worker_works for all to authenticated
  using (worker_id = auth.uid()) with check (worker_id = auth.uid() and public.app_role() = 'worker');

drop policy if exists "worker_references read" on public.worker_references;
create policy "worker_references read" on public.worker_references for select to authenticated
  using (worker_id = auth.uid() or (public.app_role() = 'contractor' and public.shares_job(auth.uid(), worker_id)));
drop policy if exists "worker_references write own" on public.worker_references;
create policy "worker_references write own" on public.worker_references for all to authenticated
  using (worker_id = auth.uid()) with check (worker_id = auth.uid() and public.app_role() = 'worker');

-- contractor_profiles: public to signed-in users, edited by the owner.
drop policy if exists "contractor_profiles read" on public.contractor_profiles;
create policy "contractor_profiles read" on public.contractor_profiles for select to authenticated using (true);
drop policy if exists "contractor_profiles update own" on public.contractor_profiles;
create policy "contractor_profiles update own" on public.contractor_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "contractor_private read" on public.contractor_private;
create policy "contractor_private read" on public.contractor_private for select to authenticated
  using (user_id = auth.uid() or (public.app_role() = 'worker' and public.is_hired_by(user_id, auth.uid())));
drop policy if exists "contractor_private update own" on public.contractor_private;
create policy "contractor_private update own" on public.contractor_private for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- profile_documents: owner only (status for others goes through the document_status view).
drop policy if exists "documents own" on public.profile_documents;
create policy "documents own" on public.profile_documents for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and ((public.app_role() = 'worker' and kind in ('idProof', 'skillCert', 'police'))
      or (public.app_role() = 'contractor' and kind in ('ownerId', 'business'))));

-- sites: workers can see the sites of jobs they can browse; contractors manage their own.
drop policy if exists "sites read" on public.sites;
create policy "sites read" on public.sites for select to authenticated using (true);
drop policy if exists "sites write own" on public.sites;
create policy "sites write own" on public.sites for all to authenticated
  using (contractor_id = auth.uid()) with check (contractor_id = auth.uid() and public.app_role() = 'contractor');

-- jobs: everyone signed in can browse; contractors manage their own.
drop policy if exists "jobs read" on public.jobs;
create policy "jobs read" on public.jobs for select to authenticated using (true);
drop policy if exists "jobs write own" on public.jobs;
create policy "jobs write own" on public.jobs for all to authenticated
  using (contractor_id = auth.uid()) with check (contractor_id = auth.uid() and public.app_role() = 'contractor');

-- applications: a worker applies/withdraws; the job's contractor accepts or rejects.
drop policy if exists "applications read" on public.applications;
create policy "applications read" on public.applications for select to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id));
drop policy if exists "applications apply" on public.applications;
create policy "applications apply" on public.applications for insert to authenticated
  with check (worker_id = auth.uid() and public.app_role() = 'worker');
drop policy if exists "applications withdraw" on public.applications;
create policy "applications withdraw" on public.applications for delete to authenticated
  using (worker_id = auth.uid() and status = 'pending');
drop policy if exists "applications decide" on public.applications;
create policy "applications decide" on public.applications for update to authenticated
  using (public.is_job_contractor(job_id)) with check (public.is_job_contractor(job_id));

-- attendance: the contractor writes it; the worker reads their own.
drop policy if exists "attendance read" on public.attendance;
create policy "attendance read" on public.attendance for select to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id));
drop policy if exists "attendance write" on public.attendance;
create policy "attendance write" on public.attendance for all to authenticated
  using (public.is_job_contractor(job_id))
  with check (public.is_job_contractor(job_id) and public.is_hired(job_id, worker_id) and marked_by = auth.uid());

-- shifts and their children
drop policy if exists "shifts read" on public.shifts;
create policy "shifts read" on public.shifts for select to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id));
drop policy if exists "shifts start" on public.shifts;
create policy "shifts start" on public.shifts for insert to authenticated
  with check (worker_id = auth.uid() and public.is_hired(job_id, worker_id));
drop policy if exists "shifts update" on public.shifts;
create policy "shifts update" on public.shifts for update to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id))
  with check (worker_id = auth.uid() or public.is_job_contractor(job_id));

drop policy if exists "shift_events read" on public.shift_events;
create policy "shift_events read" on public.shift_events for select to authenticated using (public.shift_participant(shift_id));
drop policy if exists "shift_events add" on public.shift_events;
create policy "shift_events add" on public.shift_events for insert to authenticated with check (public.shift_participant(shift_id));

drop policy if exists "shift_breaks read" on public.shift_breaks;
create policy "shift_breaks read" on public.shift_breaks for select to authenticated using (public.shift_participant(shift_id));
drop policy if exists "shift_breaks worker write" on public.shift_breaks;
create policy "shift_breaks worker write" on public.shift_breaks for all to authenticated
  using (exists (select 1 from public.shifts s where s.id = shift_id and s.worker_id = auth.uid()))
  with check (exists (select 1 from public.shifts s where s.id = shift_id and s.worker_id = auth.uid()));

drop policy if exists "shift_proofs read" on public.shift_proofs;
create policy "shift_proofs read" on public.shift_proofs for select to authenticated using (public.shift_participant(shift_id));
drop policy if exists "shift_proofs worker write" on public.shift_proofs;
create policy "shift_proofs worker write" on public.shift_proofs for all to authenticated
  using (exists (select 1 from public.shifts s where s.id = shift_id and s.worker_id = auth.uid()))
  with check (exists (select 1 from public.shifts s where s.id = shift_id and s.worker_id = auth.uid()));

-- payments: the contractor records; both sides read; the worker confirms.
drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id));
drop policy if exists "payments record" on public.payments;
create policy "payments record" on public.payments for insert to authenticated
  with check (public.is_job_contractor(job_id) and public.is_hired(job_id, worker_id));
drop policy if exists "payments update" on public.payments;
create policy "payments update" on public.payments for update to authenticated
  using (worker_id = auth.uid() or public.is_job_contractor(job_id))
  with check (worker_id = auth.uid() or public.is_job_contractor(job_id));

-- reviews: final once submitted (no update/delete); visible to the author, or to everyone once revealed.
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select to authenticated
  using (author_id = auth.uid() or public.review_revealed(job_id, worker_id));
drop policy if exists "reviews write" on public.reviews;
create policy "reviews write" on public.reviews for insert to authenticated
  with check (
    public.is_hired(job_id, worker_id)
    and public.job_ended(job_id)
    and ((public.app_role() = 'contractor' and public.is_job_contractor(job_id))
      or (public.app_role() = 'worker' and worker_id = auth.uid())));

-- notifications: you read and mark your own; you may notify someone you share a job with.
drop policy if exists "notifications read" on public.notifications;
create policy "notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications mark read" on public.notifications;
create policy "notifications mark read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications send" on public.notifications;
create policy "notifications send" on public.notifications for insert to authenticated
  with check (user_id <> auth.uid() and public.shares_job(auth.uid(), user_id));
drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. Storage
--   public-media : profile photos, logos, site photos, past-work and proof photos (anyone signed in can view)
--   documents    : ID proofs and certificates (owner only)
-- Upload to "<user id>/<anything>" in each bucket.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('documents',    'documents',    false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public-media read" on storage.objects;
create policy "public-media read" on storage.objects for select to authenticated using (bucket_id = 'public-media');
drop policy if exists "public-media write own" on storage.objects;
create policy "public-media write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "public-media update own" on storage.objects;
create policy "public-media update own" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "public-media delete own" on storage.objects;
create policy "public-media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents own" on storage.objects;
create policy "documents own" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Optional: back-fill profiles for accounts created before this script ran.
-- ---------------------------------------------------------------------
insert into public.profiles (id, role, full_name)
select u.id,
       case when u.raw_user_meta_data->>'role' in ('contractor', 'worker') then u.raw_user_meta_data->>'role' else 'worker' end,
       coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.worker_profiles (user_id)  select id from public.profiles where role = 'worker'     on conflict do nothing;
insert into public.worker_private  (user_id)  select id from public.profiles where role = 'worker'     on conflict do nothing;
insert into public.contractor_profiles (user_id) select id from public.profiles where role = 'contractor' on conflict do nothing;
insert into public.contractor_private  (user_id) select id from public.profiles where role = 'contractor' on conflict do nothing;
