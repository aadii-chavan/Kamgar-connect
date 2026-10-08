# Kamgar database

Run these in the Supabase dashboard (SQL Editor), in this order:

1. `schema.sql` – tables, security rules, storage buckets.
2. `migration_001_app.sql` – views, live updates and the role-in-token change the app needs.
3. `seed_demo.sql` – optional. Demo contractors, workers, jobs, shifts, payments and reviews for presentations
   (password `Demo@12345`). `remove_demo.sql` deletes it again.

Notes
- Email confirmation is intentionally **off**: people sign in straight after creating an account.
- Document uploads and verification are planned for a later release. The `profile_documents` table, the `documents`
  storage bucket and the `document_status` view are already in place for it; the app does not use them yet.
- Do not run `seed_demo.sql` on a project with real users.
