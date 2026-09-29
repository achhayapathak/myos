-- ==============================================================================
-- MyOS — Development Seed Script
-- File: supabase/seed.sql
--
-- Instructions:
--   MyOS is a private, single-user productivity engine. Foreign keys on all
--   tables reference auth.users(id).
--
--   DO NOT insert dummy credentials or fake users into auth.users.
--   Instead, create your owner account first:
--     1. In Supabase Dashboard -> Authentication -> Users -> "Add User"
--     2. Then run this script in the Supabase SQL Editor.
--
--   This script dynamically locates the owner's user ID and populates
--   sample development data (tasks, notes, events, reminders).
-- ==============================================================================

DO $$
DECLARE
  v_owner_id UUID;
  v_task_id UUID;
BEGIN
  -- 1. Locate the owner user ID from auth.users
  SELECT id INTO v_owner_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '⚠️  No user found in auth.users.';
    RAISE NOTICE 'Please create your owner account in Supabase Auth first:';
    RAISE NOTICE '  Supabase Dashboard -> Authentication -> Users -> Add User';
    RAISE NOTICE 'After creating the user, run this seed script again.';
    RAISE NOTICE '------------------------------------------------------------';
    RETURN;
  END IF;

  RAISE NOTICE '🌱 Seeding development data for owner user ID: %', v_owner_id;

  -- 2. Ensure Profile exists and is configured
  INSERT INTO public.profiles (user_id, display_name, timezone)
  VALUES (v_owner_id, 'Owner', 'Asia/Kolkata')
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      timezone = EXCLUDED.timezone,
      updated_at = now();

  -- 3. Seed Sample Tasks
  v_task_id := gen_random_uuid();

  INSERT INTO public.tasks (id, user_id, title, description, status, priority, due_at)
  VALUES
    (v_task_id, v_owner_id, 'Finish payment implementation', 'Complete stripe webhook validation and customer billing logic', 'todo', 'high', now() + interval '4 hours'),
    (gen_random_uuid(), v_owner_id, 'Review PR for Supabase RLS migrations', 'Verify Row Level Security policies across all user-owned tables', 'in_progress', 'medium', now() + interval '8 hours'),
    (gen_random_uuid(), v_owner_id, 'Write technical documentation', 'Document architecture, auth flow, and offline-first guidelines', 'todo', 'low', now() + interval '1 day'),
    (gen_random_uuid(), v_owner_id, 'Set up Vitest and Playwright harnesses', 'Unit and end-to-end testing setup for authentication and tasks', 'completed', 'medium', now() - interval '1 day');

  -- 4. Seed Sample Notes
  INSERT INTO public.notes (id, user_id, title, content)
  VALUES
    (
      gen_random_uuid(),
      v_owner_id,
      'System Architecture v0.1',
      E'# MyOS Architecture Overview\n\n- Next.js App Router with Server Components\n- PostgreSQL Row Level Security (RLS) on all tables\n- Single-user privacy model without public sign-ups\n- PWA and offline-first caching structure'
    ),
    (
      gen_random_uuid(),
      v_owner_id,
      'Ideas & Scratchpad',
      E'# Future Exploration\n\n- Local-first sync using CRDTs\n- Native keyboard navigation hotkeys\n- Pomodoro session analytics and focus streaks'
    );

  -- 5. Seed Sample Calendar Events
  INSERT INTO public.events (id, user_id, title, description, start_at, end_at, all_day)
  VALUES
    (gen_random_uuid(), v_owner_id, 'Engineering Standup', 'Daily project sync', now() + interval '1 hour', now() + interval '1 hour 30 minutes', false),
    (gen_random_uuid(), v_owner_id, 'Architecture Review', 'Supabase RLS & Schema walkthrough', now() + interval '4 hours', now() + interval '5 hours 30 minutes', false),
    (gen_random_uuid(), v_owner_id, 'Workout / Gym', 'Strength training session', now() + interval '8 hours', now() + interval '9 hours', false);

  -- 6. Seed Sample Reminders
  INSERT INTO public.reminders (id, user_id, title, remind_at, completed)
  VALUES
    (gen_random_uuid(), v_owner_id, 'Deploy JoinUp release to production', now() + interval '6 hours', false),
    (gen_random_uuid(), v_owner_id, 'Review daily focus metrics and active sessions', now() + interval '10 hours', false);

  -- 7. Seed Sample Completed Pomodoro Session
  INSERT INTO public.pomodoro_sessions (id, user_id, type, duration_seconds, started_at, ended_at, task_id)
  VALUES
    (gen_random_uuid(), v_owner_id, 'focus', 1500, now() - interval '2 hours', now() - interval '1 hour 35 minutes', v_task_id);

  RAISE NOTICE '✅ Development seed completed successfully.';
END $$;
