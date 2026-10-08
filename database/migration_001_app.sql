-- =====================================================================
-- Kamgar: migration 001 (run once in the SQL Editor, after schema.sql)
-- Adds what the app needs on top of the base schema:
--   * reviews_visible : reviews the signed-in user may see, with a "revealed" flag and job info
--   * worker_stats    : number of finished jobs per worker
--   * realtime        : live updates for shifts, applications, payments and notifications
-- Safe to run more than once.
-- =====================================================================

-- Reviews the current user may read (row level security of "reviews" still applies),
-- plus whether each one is public and which job it was about.
create or replace view public.reviews_visible with (security_invoker = true) as
  select r.id, r.job_id, r.worker_id, r.author_role, r.author_id, r.from_name, r.rating, r.criteria, r.comment, r.created_on,
         public.review_revealed(r.job_id, r.worker_id) as revealed,
         j.title as job_title, j.area as job_area
  from public.reviews r
  join public.jobs j on j.id = r.job_id;
grant select on public.reviews_visible to authenticated;

-- How many jobs each worker has finished (accepted on a job that has ended).
create or replace view public.worker_stats as
  select a.worker_id, count(*)::int as completed_jobs
  from public.applications a
  join public.jobs j on j.id = a.job_id
  where a.status = 'accepted' and (j.closed or j.end_date < current_date)
  group by a.worker_id;
grant select on public.worker_stats to authenticated;

-- Live updates
do $$
declare t text;
begin
  foreach t in array array['shifts', 'shift_events', 'applications', 'payments', 'notifications', 'attendance', 'jobs', 'reviews'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Reports: a user can flag a review for the team to check (once per review).
-- ---------------------------------------------------------------------
create table if not exists public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
drop policy if exists "report a review" on public.review_reports;
create policy "report a review" on public.review_reports for insert to authenticated
  with check (reporter_id = auth.uid() and exists (select 1 from public.reviews_visible v where v.id = review_id));
drop policy if exists "see own reports" on public.review_reports;
create policy "see own reports" on public.review_reports for select to authenticated using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------
-- Role in the signed-in token. app_metadata can only be changed by the server, so the app
-- can trust it (user_metadata can be edited by the user). The profiles table stays the source of truth.
-- ---------------------------------------------------------------------
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
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', r) where id = new.id;
  return new;
end $$;

-- Existing accounts (including demo users): copy the role into their app_metadata.
update auth.users u
   set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
  from public.profiles p
 where p.id = u.id and (u.raw_app_meta_data->>'role') is distinct from p.role;
