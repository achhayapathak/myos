# MyOS — Supabase Setup & Architecture Guide

This document describes the complete setup, configuration, and security requirements for provisioning a Supabase project for MyOS.

---

## 1. Project Creation

1. Log in to [Supabase](https://app.supabase.com) and click **New Project**.
2. **Project Name**: `MyOS` (or your preferred name).
3. **Database Password**: Generate a secure, 32+ character random password. Store this securely in your password manager.
4. **Region**: Select the region closest to where you physically operate to minimize latency.
5. **Pricing Plan**: Free tier is sufficient for a single-user MyOS instance.

---

## 2. Authentication Configuration (Single-User Hardening)

Because MyOS is a **private, single-user productivity application**, authentication settings must be locked down to prevent unauthorized public registration.

### Step 2.1: Email Auth Settings
Navigate to **Authentication** → **Providers** → **Email**:
1. **Enable Email provider**: `ON`
2. **Confirm email**: `ON` (recommended for production)
3. **Secure email change**: `ON`

### Step 2.2: Disable Public Signups
Navigate to **Authentication** → **Attack Protection** / **Signups**:
1. Set **Allow new users to sign up**: `OFF` (once your owner account is created).
2. *Note*: During initial setup, temporarily enable signups to register your owner account, then immediately toggle this setting to `OFF`. Alternatively, manually invite the owner email via **Authentication** → **Users** → **Invite user**.

### Step 2.3: Redirect URLs
Navigate to **Authentication** → **URL Configuration**:
1. **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://your-myos-domain.com`
2. **Redirect URLs** (Allow List):
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://your-myos-domain.com/auth/callback`
   - `https://your-myos-domain.com/reset-password`

---

## 3. Database Schema & Tables

MyOS utilizes 8 tables in the `public` schema. Every table is protected by PostgreSQL Row Level Security (RLS).

| Table Name | Description | Primary Key | Foreign Key |
| :--- | :--- | :--- | :--- |
| `profiles` | User profile and preferences | `id UUID` | `user_id -> auth.users(id)` |
| `tasks` | Tasks, todos, due dates, statuses | `id UUID` | `user_id -> auth.users(id)` |
| `notes` | Markdown notes with full-text search | `id UUID` | `user_id -> auth.users(id)` |
| `events` | Calendar events (UTC timestamps) | `id UUID` | `user_id -> auth.users(id)` |
| `pomodoro_sessions` | Focus sessions and intervals | `id UUID` | `user_id -> auth.users(id)` |
| `reminders` | Scheduled reminders | `id UUID` | `user_id -> auth.users(id)` |
| `push_subscriptions` | Browser Web Push VAPID endpoints | `id UUID` | `user_id -> auth.users(id)` |
| `notification_deliveries` | Notification queue and delivery audit log | `id UUID` | `user_id -> auth.users(id)` |

---

## 4. PostgreSQL Extensions

MyOS requires the following PostgreSQL extensions:
1. `pg_trgm`: Trigram matching for fast search across tasks, notes, and calendar events.
2. `uuid-ossp` or `pgcrypto`: UUID generation (`gen_random_uuid()`).

Both extensions are enabled automatically in migration `20261003000001_search_indexes.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 5. Security & Row Level Security (RLS) Rules

### Invariant 1: Mandatory RLS on Every Table
Every user-owned table has RLS explicitly enabled:
```sql
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
```

### Invariant 2: Explicit User Scoping
Every table has policies enforcing `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
Example:
```sql
CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Invariant 3: Pinned `search_path` on SECURITY DEFINER Functions
The user profile provisioning trigger function `handle_new_user()` is configured with:
```sql
SECURITY DEFINER
SET search_path = public, pg_temp
```
This protects against search_path hijacking vulnerabilities in PostgreSQL.

---

## 6. Verification Checklist

Run the verification script from your local development environment:
```bash
node scripts/check-supabase.mjs
```
The script validates:
- Connection to Supabase URL
- Anon key functionality
- Service role key functionality
- Presence of required database tables
- RLS policy activation on all tables
