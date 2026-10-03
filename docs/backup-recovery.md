# MyOS — Backup & Recovery Runbook

This document defines disaster recovery procedures, automated backup policies, and manual backup/restoration workflows for the MyOS application database.

---

## 1. Recovery Objectives

For a private, single-user productivity application:
- **Recovery Point Objective (RPO)**: < 24 hours (maximum data loss acceptable: 1 day's productivity logs).
- **Recovery Time Objective (RTO)**: < 1 hour (time required to restore service from backup).

---

## 2. Automated Backups

### Supabase Platform Backups
- **Free Tier**: Daily logical backups are retained for 7 days.
- **Pro Tier**: Daily backups are retained for 7 days with optional Point-in-Time Recovery (PITR) up to 7 or 28 days.
- Automated backups can be restored directly via the Supabase Dashboard:
  **Project Settings** → **Database** → **Backups** → **Restore**.

---

## 3. Manual Backup Procedure (`pg_dump`)

You should take a manual backup before performing major database migrations or infrastructure changes.

### Step 3.1: Retrieve Database Connection String
1. In the Supabase Dashboard, go to **Project Settings** → **Database**.
2. Under **Connection string**, select **URI**.
3. Choose the **Direct connection** (port 5432) or **Session Pooler** (port 5432).

### Step 3.2: Export Full Database Backup
Run `pg_dump` with custom compressed archive format (`-Fc`) or plain SQL (`-Fp`):
```bash
# Compressed binary dump (recommended)
pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -Fc \
  -f myos_backup_$(date +%Y%m%d_%H%M%S).dump

# Or plain SQL format for easy inspection
pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -f myos_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3.3: Secure the Backup
Backups contain personal tasks, notes, and calendar events. Store backup files:
- In an encrypted location (e.g., encrypted disk image, password-protected archive).
- Never commit database dump files to Git.

---

## 4. Restoration Procedure

### Scenario A: Full Disaster Recovery (Restoring into New Instance)

1. **Provision a new Supabase project** (follow `docs/supabase-setup.md`).
2. **Apply migrations** to configure tables, indexes, and RLS:
   ```bash
   pnpm dlx supabase db push
   ```
3. **Restore data only** from the backup archive:
   ```bash
   pg_restore \
     --dbname="postgres://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres" \
     --data-only \
     --schema=public \
     --disable-triggers \
     myos_backup_YYYYMMDD_HHMMSS.dump
   ```
4. **Update environment variables** in Vercel/production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Redeploy application**.

---

### Scenario B: Restoring a Single Table (e.g. Accidental Notes Deletion)

To restore only the `notes` table without overwriting other records:
```bash
pg_restore \
  --dbname="[CONNECTION-STRING]" \
  --table=notes \
  --data-only \
  myos_backup_YYYYMMDD_HHMMSS.dump
```

---

## 5. Backup Verification Schedule

| Activity | Frequency | Responsible |
| :--- | :--- | :--- |
| Check Supabase backup dashboard | Weekly | Owner |
| Manual offsite export (`pg_dump`) | Monthly or before major release | Owner |
| Test restore onto local Supabase instance | Quarterly | Owner |
