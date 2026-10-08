-- =====================================================================
-- Kamgar: wipe all app data but KEEP the accounts (logins and names).
-- Everyone can still sign in; they start again with an empty, not-yet-onboarded profile.
-- Tables, security rules, views and storage buckets stay. This cannot be undone.
-- Run in the Supabase SQL Editor.
-- =====================================================================

truncate table
  public.notifications, public.review_reports, public.reviews, public.payments, public.attendance,
  public.shift_proofs, public.shift_breaks, public.shift_events, public.shifts,
  public.applications, public.jobs, public.sites,
  public.worker_works, public.worker_references, public.profile_documents,
  public.worker_profiles, public.worker_private, public.contractor_profiles, public.contractor_private
restart identity cascade;

-- Give every account a fresh, empty profile row again.
insert into public.worker_profiles     (user_id) select id from public.profiles where role = 'worker';
insert into public.worker_private      (user_id) select id from public.profiles where role = 'worker';
insert into public.contractor_profiles (user_id) select id from public.profiles where role = 'contractor';
insert into public.contractor_private  (user_id) select id from public.profiles where role = 'contractor';

-- Uploaded photos stay in Storage. To remove them: Dashboard > Storage > public-media / documents > select all > Delete.
