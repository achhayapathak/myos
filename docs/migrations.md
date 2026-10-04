# MyOS — Database Migration Instructions

This document provides detailed instructions for applying, verifying, and managing PostgreSQL database migrations for MyOS.

---

## 1. Migration Overview

Migrations are stored chronologically in `supabase/migrations/`. Each migration file follows standard ISO timestamp naming (`YYYYMMDDHHMMSS_description.sql`).

All migrations are designed to be **idempotent** (`IF NOT EXISTS`, `OR REPLACE`) to prevent failure if partially applied.

### Migration Files

| Order | Migration File | Description |
| :--- | :--- | :--- |
| **1** | `20260929000000_initial_schema.sql` | Creates 7 core tables (`profiles`, `tasks`, `notes`, `events`, `pomodoro_sessions`, `reminders`, `push_subscriptions`), foreign keys, RLS policies, and profile trigger. |
| **2** | `20260929000001_security_hardening.sql` | Hardens `handle_new_user()` with `SET search_path = public, pg_temp` and sets `DEFAULT auth.uid()` across all `user_id` columns. |
| **3** | `20261003000000_notification_deliveries.sql` | Creates `notification_deliveries` queue table, RLS policies, status constraints, and partial index on pending deliveries. |
| **4** | `20261003000001_search_indexes.sql` | Enables PostgreSQL `pg_trgm` extension and creates GIN trigram indexes on task titles/descriptions, note titles/contents, and event titles/descriptions. |
| **5** | `20261003000002_performance_indexes.sql` | Adds composite and partial indexes for hot paths: `(user_id, status, due_at)`, `(user_id, priority, status)`, `(user_id, completed, remind_at)`, and active Pomodoro sessions (`WHERE ended_at IS NULL`). |
| **6** | `20261004000000_habits.sql` | Creates `habits` and `habit_completions` tables with RLS policies, indexes, and cascades. |
| **7** | `20261004000001_pomodoro_pause.sql` | Adds `paused_at` column to `pomodoro_sessions` for pause and resume tracking. |

---

## 2. Applying Migrations

### Method A: Supabase CLI (Recommended)

1. Ensure the Supabase CLI is installed:
   ```bash
   pnpm dlx supabase --version
   ```
2. Link your local project to your remote Supabase project:
   ```bash
   pnpm dlx supabase link --project-ref <your-project-ref>
   ```
   *(Find your project reference in the Supabase Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`)*
3. Push migrations to the database:
   ```bash
   pnpm dlx supabase db push
   ```
4. Verify migration status:
   ```bash
   pnpm dlx supabase migration list
   ```

---

### Method B: Supabase Dashboard SQL Editor (Manual)

If you do not have the CLI configured, you can apply migrations directly via the Supabase Web Dashboard:

1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** from the left navigation.
3. Apply each migration file **in chronological order**:
   - Copy contents of `supabase/migrations/20260929000000_initial_schema.sql` → Run
   - Copy contents of `supabase/migrations/20260929000001_security_hardening.sql` → Run
   - Copy contents of `supabase/migrations/20261003000000_notification_deliveries.sql` → Run
   - Copy contents of `supabase/migrations/20261003000001_search_indexes.sql` → Run
   - Copy contents of `supabase/migrations/20261003000002_performance_indexes.sql` → Run
4. Verify all tables exist under **Table Editor**.

---

## 3. Applying Seed Data (Optional / Local Dev)

For local development and testing, a sample seed file is provided at `supabase/seed.sql`.

> **CAUTION**: Do **NOT** run `seed.sql` on a production database. It contains dummy test tasks, mock events, and placeholder user records.

To apply seed data locally:
```bash
pnpm dlx supabase db reset
```
This drops the local database, applies all migrations in order, and executes `supabase/seed.sql`.

---

## 4. Migration Verification

After applying migrations, run the automated verification script:
```bash
node scripts/check-supabase.mjs
```
Expected output:
- `✓ Connected to Supabase`
- `✓ All 8 tables present`
- `✓ Row Level Security (RLS) active on all tables`
