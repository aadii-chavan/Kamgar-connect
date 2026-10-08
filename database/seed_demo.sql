-- =====================================================================
-- Kamgar: demo data for presentations
-- Run AFTER schema.sql, in the Supabase SQL Editor. Safe to run again (it wipes and recreates the demo users).
-- Every demo account uses the email domain @demo.kamgar.app and the password  Demo@12345
--   Contractors: rajesh@demo.kamgar.app   meena@demo.kamgar.app
--   Workers:     sunil@ / dattatray@ / tukaram@ / ganesh@ / rohit@ / savita@ / imran@  (all @demo.kamgar.app)
-- Dates are relative to today, so the data always looks current.
-- To remove everything again, run remove_demo.sql.
-- =====================================================================

-- 0. Patch two trigger functions so the SQL editor (no signed-in user) can insert admin data.
--    (Same change as in schema.sql; harmless if already applied.)
create or replace function public.applications_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.status := 'pending'; end if;
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

create or replace function public.reviews_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
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

-- 1. Start clean: removing the users removes everything that belongs to them.
delete from auth.users where email like '%@demo.kamgar.app';

-- 2. Accounts. The on-signup trigger creates the profile rows from the metadata.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       crypt('Demo@12345', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('role', u.role, 'full_name', u.name, 'phone', u.phone),
       now(), now(), '', '', '', ''
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'rajesh@demo.kamgar.app',    'contractor', 'Rajesh Kulkarni',   '9822011001'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'meena@demo.kamgar.app',     'contractor', 'Meena Deshmukh',    '9822011002'),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'sunil@demo.kamgar.app',     'worker',     'Sunil Jadhav',      '9822014501'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'dattatray@demo.kamgar.app', 'worker',     'Dattatray Gaikwad', '9822014502'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'tukaram@demo.kamgar.app',   'worker',     'Tukaram Mane',      '9822014503'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'ganesh@demo.kamgar.app',    'worker',     'Ganesh Shinde',     '9822014504'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'rohit@demo.kamgar.app',     'worker',     'Rohit Thakur',      '9822014505'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'savita@demo.kamgar.app',    'worker',     'Savita Pawar',      '9822014506'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'imran@demo.kamgar.app',     'worker',     'Imran Shaikh',      '9822014507')
) as u(id, email, role, name, phone);

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', id::text, now(), now(), now()
from auth.users where email like '%@demo.kamgar.app';

-- 3. Worker profiles
update public.worker_profiles w set onboarded = true, phone_verified = true,
  area = v.area, native_place = v.native, skill = v.skill, other_skills = v.other, experience = v.exp,
  languages = v.langs, rate = v.rate, availability = v.avail, about = v.about
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Wakad',        'Satara',   'Mason',      '{Helper}'::text[],        12, '{Marathi,Hindi}'::text[],         850, 'now',  'Experienced mason doing brickwork, plaster and boundary walls. Reliable, on time and careful with finishing.'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Hinjewadi',    'Beed',     'Mason',      '{}'::text[],               8, '{Marathi,Hindi}'::text[],         800, 'now',  'Brick masonry and RCC shuttering. Can lead a small crew.'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Hadapsar',     'Solapur',  'Helper',     '{}'::text[],               4, '{Marathi}'::text[],               500, 'now',  'Hard-working helper for site cleanup, material shifting and mixing.'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'Baner',        'Nashik',   'Painter',    '{}'::text[],               9, '{Marathi,Hindi,English}'::text[], 750, 'week', 'Interior and exterior painting, putty and texture finishes.'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'Kharadi',      'Pune',     'Electrician','{}'::text[],              10, '{Marathi,Hindi,English}'::text[],1000, 'now',  'House and shop wiring, panel upgrades and fault finding. ITI certified.'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'Viman Nagar',  'Latur',    'Tile Fitter','{}'::text[],               6, '{Marathi,Hindi}'::text[],         900, 'week', 'Floor and bathroom tiling with neat, level finishing.'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'Kothrud',      'Kolhapur', 'Plumber',    '{}'::text[],               7, '{Marathi,Hindi,Urdu}'::text[],    950, 'now',  'Bathroom fitting, water line repair and tank installation.')
) as v(id, area, native, skill, other, exp, langs, rate, avail, about)
where w.user_id = v.id;

update public.worker_private p set birth_year = v.yr, emergency_name = v.en, emergency_phone = v.ep, upi = v.upi
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 1992, 'Sangita Jadhav', '9822014999', 'sunil.jadhav@upi'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 1995, 'Vandana Gaikwad','9822014998', 'dattatray.g@upi'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 2000, 'Mane Sr.',       '9822014997', ''),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 1990, 'Asha Shinde',    '9822014996', 'ganesh.shinde@upi'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 1988, 'Pooja Thakur',   '9822014995', 'rohit.t@upi'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 1997, 'Kavita Pawar',   '9822014994', 'savita.pawar@upi'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 1993, 'Nasreen Shaikh', '9822014993', 'imran.s@upi')
) as v(id, yr, en, ep, upi)
where p.user_id = v.id;

insert into public.worker_works (worker_id, title, skill, area, year, description) values
  ('a0000000-0000-4000-8000-000000000001', 'Boundary wall, 2 acre plot', 'Mason', 'Wakad',  extract(year from current_date)::int - 1, 'Built 400 ft of brick boundary wall with plastering.'),
  ('a0000000-0000-4000-8000-000000000001', 'Brick masonry, G+2',         'Mason', 'Baner',  extract(year from current_date)::int - 2, 'Complete brickwork for a G+2 residential building.'),
  ('a0000000-0000-4000-8000-000000000004', 'Interior painting, 3 BHK',   'Painter','Aundh', extract(year from current_date)::int - 1, 'Two coats with putty and primer.'),
  ('a0000000-0000-4000-8000-000000000005', 'Society CCTV wiring',        'Electrician','Baner', extract(year from current_date)::int - 1, 'Cabling for 24 cameras across 3 buildings.');

insert into public.worker_references (worker_id, name, relation, phone) values
  ('a0000000-0000-4000-8000-000000000001', 'Anil Bhosale', 'Previous contractor', '9822055001'),
  ('a0000000-0000-4000-8000-000000000005', 'Sandeep Kale', 'Site engineer',       '9822055002');

-- 4. Contractor profiles
update public.contractor_profiles c set onboarded = true, phone_verified = true,
  company = v.company, kind = v.kind, years_in_business = v.yrs, team_size = v.team, city = 'Pune',
  areas = v.areas, trades = v.trades, about = v.about, pledge = true
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Kulkarni Constructions', 'firm', 14, '21-50',
     '{Wakad,Baner,Hinjewadi,Aundh}'::text[], '{Mason,Painter,Electrician,Helper,Tile Fitter}'::text[],
     'Residential and commercial construction across Pune. We pay on the day the work is approved and provide water, toilets and helmets on every site.'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'Deshmukh Builders', 'company', 6, '6-20',
     '{Kharadi,Viman Nagar,Hadapsar}'::text[], '{Plumber,Painter,Carpenter}'::text[],
     'Interior fit-outs and plumbing for offices and apartments.')
) as v(id, company, kind, yrs, team, areas, trades, about)
where c.user_id = v.id;

update public.contractor_private p set office_address = v.addr, gst = v.gst, upi = v.upi
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Office 4, Shivaji Chowk, Wakad, Pune 411057', '27ABCDE1234F1Z5', 'kulkarniconstructions@upi'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'Shop 12, Magarpatta Road, Hadapsar, Pune 411028', '', 'deshmukhbuilders@upi')
) as v(id, addr, gst, upi)
where p.user_id = v.id;

-- 5. Sites
insert into public.sites (id, contractor_id, name, area, address, kind, contact_name, contact_phone, amenities) values
  ('51000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Green Park Residency',  'Wakad',  'Plot 14, Datta Mandir Road, Wakad, Pune 411057',  'residential', 'Rajesh Kulkarni', '9822011001', '{water,toilet,firstAid,helmets,shade}'),
  ('51000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Baner Heights',         'Baner',  'Survey 22, Baner Road, Pune 411045',               'residential', 'Site supervisor', '9822011101', '{water,toilet,helmets,meals}'),
  ('51000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Hinjewadi Warehouse',  'Hinjewadi','Phase 2, Hinjewadi MIDC, Pune 411057',            'industrial',  'Rajesh Kulkarni', '9822011001', '{water,toilet,firstAid,helmets,transport}'),
  ('51000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Kharadi Tech Tower B', 'Kharadi','EON IT Park Road, Kharadi, Pune 411014',            'commercial',  'Meena Deshmukh',  '9822011002', '{water,toilet,firstAid,helmets}');

-- 6. Jobs (dates relative to today)
insert into public.jobs (id, contractor_id, site_id, title, skill, area, address, needed, pay_type, amount, start_date, end_date, report_time, shift_hours, closed, posted_on) values
  ('10000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','Brick masonry, G+2',         'Mason',      'Wakad',    'Plot 14, Datta Mandir Road, Wakad, Pune 411057', 3,'daily',  850, current_date-9,  current_date+12,'08:00',8,false,current_date-11),
  ('10000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000002','Interior painting, 3 BHK',  'Painter',    'Baner',    'Survey 22, Baner Road, Pune 411045',             2,'daily',  750, current_date-4,  current_date+6, '08:30',8,false,current_date-6),
  ('10000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','House wiring',              'Electrician','Wakad',    'Plot 14, Datta Mandir Road, Wakad, Pune 411057', 1,'daily', 1000, current_date,    current_date+5, '09:00',8,false,current_date-2),
  ('10000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000003','Compound wall',             'Mason',      'Hinjewadi','Phase 2, Hinjewadi MIDC, Pune 411057',           3,'daily',  800, current_date-26, current_date-20,'08:00',8,true, current_date-28),
  ('10000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000002','Bathroom tiling',          'Tile Fitter','Baner',    'Survey 22, Baner Road, Pune 411045',             2,'daily',  900, current_date+2,  current_date+9, '08:00',8,false,current_date-1),
  ('10000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000003','Boundary wall',             'Mason',      'Hinjewadi','Phase 2, Hinjewadi MIDC, Pune 411057',           2,'daily',  800, current_date-75, current_date-65,'08:00',8,true, current_date-78),
  ('10000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000004','Plumbing, Tower B',        'Plumber',    'Kharadi',  'EON IT Park Road, Kharadi, Pune 411014',         2,'daily',  950, current_date-3,  current_date+10,'08:00',8,false,current_date-5),
  ('10000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000004','Office repainting',        'Painter',    'Kharadi',  'EON IT Park Road, Kharadi, Pune 411014',         3,'daily',  700, current_date+1,  current_date+8, '08:30',8,false,current_date-1);

-- 7. Applications
insert into public.applications (job_id, worker_id, status, applied_on) values
  ('10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','accepted',current_date-10),
  ('10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','accepted',current_date-10),
  ('10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','accepted',current_date-10),
  ('10000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000004','accepted',current_date-5),
  ('10000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000005','accepted',current_date-1),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','accepted',current_date-27),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','accepted',current_date-27),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000003','accepted',current_date-27),
  ('10000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000006','pending', current_date),
  ('10000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000007','pending', current_date),
  ('10000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','accepted',current_date-77),
  ('10000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000003','accepted',current_date-77),
  ('10000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','accepted',current_date-4),
  ('10000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000004','pending', current_date),
  ('10000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000006','rejected',current_date-5);

-- 8. Attendance for past days (about 80% present, 10% half day, 10% absent, varying by worker and date)
insert into public.attendance (job_id, worker_id, day, mark, marked_by)
select a.job_id, a.worker_id, d::date,
       case abs(hashtext(a.job_id::text || a.worker_id::text || d::text)) % 10 when 0 then 'A' when 1 then 'H' else 'P' end,
       j.contractor_id
from public.applications a
join public.jobs j on j.id = a.job_id
cross join lateral generate_series(j.start_date, least(j.end_date, current_date - 1), interval '1 day') d
where a.status = 'accepted';

-- 9. Today's live shifts
insert into public.shifts (id, job_id, worker_id, day, status, journey_at, journey_ms, distance_km, arrived_at, check_in_at, check_out_at, late_min,
                           decision_mark, decision_at, decision_hours, decision_note) values
  -- Sunil: working now
  ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001', current_date,'working',
     now()-interval '2 hours 40 minutes', 900000, 3.2, now()-interval '2 hours 25 minutes', now()-interval '2 hours 20 minutes', null, 0, null,null,null,null),
  -- Dattatray: finished and approved
  ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002', current_date,'approved',
     now()-interval '9 hours', 720000, 2.1, now()-interval '8 hours 48 minutes', now()-interval '8 hours 40 minutes', now()-interval '30 minutes', 0, 'P', now()-interval '10 minutes', 7.6, 'Good work today'),
  -- Tukaram: on the way
  ('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003', current_date,'on_the_way',
     now()-interval '6 minutes', 1080000, 4.8, null, null, null, null, null,null,null,null),
  -- Rohit: not started yet
  ('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000005', current_date,'scheduled',
     null, null, null, null, null, null, null, null,null,null,null),
  -- Imran: done, waiting for the contractor to approve
  ('50000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007', current_date,'done',
     now()-interval '9 hours', 840000, 3.5, now()-interval '8 hours 45 minutes', now()-interval '8 hours 35 minutes', now()-interval '20 minutes', 0, null,null,null,null);

insert into public.attendance (job_id, worker_id, day, mark, marked_by)
values ('10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002', current_date, 'P', 'c0000000-0000-4000-8000-000000000001');

insert into public.shift_events (shift_id, type, at, note) values
  ('50000000-0000-4000-8000-000000000001','journey_started', now()-interval '2 hours 40 minutes', null),
  ('50000000-0000-4000-8000-000000000001','arrived',         now()-interval '2 hours 25 minutes', null),
  ('50000000-0000-4000-8000-000000000001','checked_in',      now()-interval '2 hours 20 minutes', null),
  ('50000000-0000-4000-8000-000000000002','journey_started', now()-interval '9 hours', null),
  ('50000000-0000-4000-8000-000000000002','arrived',         now()-interval '8 hours 48 minutes', null),
  ('50000000-0000-4000-8000-000000000002','checked_in',      now()-interval '8 hours 40 minutes', null),
  ('50000000-0000-4000-8000-000000000002','checked_out',     now()-interval '30 minutes', null),
  ('50000000-0000-4000-8000-000000000002','approved',        now()-interval '10 minutes', 'Good work today'),
  ('50000000-0000-4000-8000-000000000003','journey_started', now()-interval '6 minutes', null),
  ('50000000-0000-4000-8000-000000000005','journey_started', now()-interval '9 hours', null),
  ('50000000-0000-4000-8000-000000000005','arrived',         now()-interval '8 hours 45 minutes', null),
  ('50000000-0000-4000-8000-000000000005','checked_in',      now()-interval '8 hours 35 minutes', null),
  ('50000000-0000-4000-8000-000000000005','checked_out',     now()-interval '20 minutes', null);

insert into public.shift_breaks (shift_id, starts_at, ends_at) values
  ('50000000-0000-4000-8000-000000000002', now()-interval '5 hours', now()-interval '4 hours 30 minutes'),
  ('50000000-0000-4000-8000-000000000005', now()-interval '5 hours', now()-interval '4 hours 30 minutes');

-- 10. Payments for the completed jobs (amount = days worked x daily rate)
insert into public.payments (job_id, worker_id, amount, paid_on, mode, confirmed, confirmed_at)
select j.id, at.worker_id,
       round(sum(case at.mark when 'P' then 1 when 'H' then 0.5 else 0 end) * j.amount)::int,
       j.end_date + 1,
       case row_number() over (partition by j.id order by at.worker_id) when 1 then 'UPI' when 2 then 'Cash' else 'Bank' end,
       true, (j.end_date + 2)::timestamptz
from public.attendance at join public.jobs j on j.id = at.job_id
where j.id in ('10000000-0000-4000-8000-000000000006')
group by j.id, at.worker_id, j.amount, j.end_date;

-- The newer completed job: two workers paid (one has not confirmed yet), one still owed.
insert into public.payments (job_id, worker_id, amount, paid_on, mode, confirmed, confirmed_at)
select j.id, at.worker_id,
       round(sum(case at.mark when 'P' then 1 when 'H' then 0.5 else 0 end) * j.amount)::int,
       current_date - 15,
       case at.worker_id when 'a0000000-0000-4000-8000-000000000001'::uuid then 'UPI' else 'Cash' end,
       at.worker_id = 'a0000000-0000-4000-8000-000000000001'::uuid,
       case when at.worker_id = 'a0000000-0000-4000-8000-000000000001'::uuid then now() - interval '14 days' end
from public.attendance at join public.jobs j on j.id = at.job_id
where j.id = '10000000-0000-4000-8000-000000000004'
  and at.worker_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')
group by j.id, at.worker_id, j.amount;

-- 11. Reviews
--   Boundary wall (ended 65+ days ago): both sides reviewed, so these are public.
--   Compound wall (ended 20 days ago): Rajesh reviewed Sunil and Dattatray; only Sunil reviewed back.
--   So Sunil's pair is public, and Dattatray's review stays hidden until he reviews Rajesh.
insert into public.reviews (job_id, worker_id, author_role, author_id, from_name, rating, criteria, comment, created_on) values
  ('10000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','contractor','c0000000-0000-4000-8000-000000000001','Kulkarni Constructions',5,'{5,5,4}','Neat brickwork and always on time.', current_date-64),
  ('10000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000003','contractor','c0000000-0000-4000-8000-000000000001','Kulkarni Constructions',4,'{4,5,4}','Hard worker, quick to learn.', current_date-64),
  ('10000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','worker',    'a0000000-0000-4000-8000-000000000001','Sunil Jadhav',          5,'{5,5,5}','Paid on the same day and the site was safe.', current_date-63),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','contractor','c0000000-0000-4000-8000-000000000001','Kulkarni Constructions',5,'{5,4,5}','Reliable, leads the others well.', current_date-19),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','worker',    'a0000000-0000-4000-8000-000000000001','Sunil Jadhav',          4,'{4,5,5}','Good site, clear instructions.', current_date-18),
  ('10000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','contractor','c0000000-0000-4000-8000-000000000001','Kulkarni Constructions',4,'{4,4,5}','Good finishing work.', current_date-19);

-- 12. Notifications
insert into public.notifications (user_id, key, vars, href, read, created_at) values
  ('c0000000-0000-4000-8000-000000000001', '{name} applied for {job}',            '{"name":"Savita Pawar","job":"Bathroom tiling"}',  '/applicants?status=pending', false, now()-interval '40 minutes'),
  ('c0000000-0000-4000-8000-000000000001', '{name} applied for {job}',            '{"name":"Imran Shaikh","job":"Bathroom tiling"}',  '/applicants?status=pending', false, now()-interval '25 minutes'),
  ('c0000000-0000-4000-8000-000000000001', '{name} is on the way to {job}',       '{"name":"Tukaram Mane","job":"Brick masonry, G+2"}','/live', false, now()-interval '6 minutes'),
  ('c0000000-0000-4000-8000-000000000002', '{name} finished the day at {job}. Please review and approve.', '{"name":"Imran Shaikh","job":"Plumbing, Tower B"}', '/live', false, now()-interval '20 minutes'),
  ('a0000000-0000-4000-8000-000000000001', '{amount} was paid for {job} via {mode}. Please confirm you received it.', '{"amount":"₹4,400","job":"Compound wall","mode":"UPI"}', '/worker/payouts', true, now()-interval '15 days'),
  ('a0000000-0000-4000-8000-000000000002', 'Your day at {job} was approved as {mark}', '{"job":"Brick masonry, G+2","mark":"Present"}', '/worker/today', false, now()-interval '10 minutes');

-- Done. Sign in with any demo email above and the password Demo@12345.
