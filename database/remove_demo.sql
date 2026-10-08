-- Removes every demo account and everything that belongs to them (profiles, jobs, sites, shifts, payments, reviews, notifications).
delete from auth.users where email like '%@demo.kamgar.app';

-- Also removes accounts created by automated tests.
delete from auth.users where email like '%@kamgar-test.dev';
