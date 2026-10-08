-- =====================================================================
-- Kamgar: wipe ALL data and ALL accounts. Tables, security rules, views and storage buckets stay.
-- Run in the Supabase SQL Editor. This cannot be undone.
-- (Needs schema.sql and migration_001_app.sql to have been run, since it clears review_reports too.)
--
-- Want to keep the logins? Use clean_data_keep_accounts.sql instead.
-- =====================================================================

-- Deleting the accounts removes everything that belongs to them: profiles, worker/contractor details,
-- sites, jobs, applications, attendance, shifts, payments, reviews, reports and notifications.
delete from auth.users;

-- Safety net: clear anything that might be left over.
truncate table
  public.notifications, public.review_reports, public.reviews, public.payments, public.attendance,
  public.shift_proofs, public.shift_breaks, public.shift_events, public.shifts,
  public.applications, public.jobs, public.sites,
  public.worker_works, public.worker_references, public.profile_documents,
  public.worker_profiles, public.worker_private, public.contractor_profiles, public.contractor_private,
  public.profiles
restart identity cascade;

-- Uploaded photos stay in Storage. To remove them: Dashboard > Storage > public-media / documents > select all > Delete.
