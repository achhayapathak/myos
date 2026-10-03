# MyOS — Production Deployment Guide

This guide details the deployment of MyOS to production using Vercel (recommended) or a self-hosted Node.js / Docker environment.

---

## 1. Pre-Deployment Checklist

Before deploying to production, ensure you have completed the following steps:

- [ ] **All migrations applied to production Supabase**:
  Check `docs/migrations.md` to ensure all 5 migration files are applied.
- [ ] **Row Level Security active on all 8 tables**:
  Run `node scripts/check-supabase.mjs` against production credentials.
- [ ] **Supabase Auth public signups disabled**:
  Verify in Supabase Dashboard (**Authentication** → **Signups** → **Allow new users to sign up**: `OFF`).
- [ ] **All tests passing**:
  `pnpm run test` (390+ tests passing).
- [ ] **TypeScript & Lint clean**:
  `pnpm run typecheck` and `pnpm run lint` succeed with 0 errors.
- [ ] **Production build verified**:
  `pnpm run build` succeeds locally.
- [ ] **VAPID keys generated**:
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are ready.

---

## 2. Deploying to Vercel (Recommended)

Next.js App Router is optimized for deployment on Vercel's Edge and Serverless infrastructure.

### Step 2.1: Import Project in Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your Git repository (`work` / `myos`).
4. **Framework Preset**: Next.js (auto-detected).
5. **Root Directory**: `./` (default).
6. **Package Manager**: `pnpm` (auto-detected via `pnpm-lock.yaml`).

### Step 2.2: Configure Environment Variables in Vercel
Under **Environment Variables**, add:

| Key | Value | Environment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<your-supabase-anon-key>` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your-supabase-service-role-key>` | Production, Preview |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `<your-vapid-public-key>` | Production, Preview |
| `VAPID_PRIVATE_KEY` | `<your-vapid-private-key>` | Production, Preview |
| `VAPID_SUBJECT` | `mailto:owner@yourdomain.com` | Production, Preview |

### Step 2.3: Deploy
Click **Deploy**. Vercel will run `pnpm install`, `next build`, and deploy the application.

### Step 2.4: Configure Custom Domain & SSL
1. In Vercel, navigate to **Project Settings** → **Domains**.
2. Add your custom domain (e.g. `myos.yourdomain.com`).
3. Configure your DNS provider with the specified `CNAME` or `A` records.
4. Vercel automatically provisions and renews a Let's Encrypt SSL/TLS certificate.

### Step 2.5: Update Supabase Redirect URLs
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** → **URL Configuration**.
3. Set **Site URL**: `https://myos.yourdomain.com`.
4. Add to **Redirect URLs**:
   - `https://myos.yourdomain.com/auth/callback`
   - `https://myos.yourdomain.com/reset-password`

---

## 3. Production Hardening & Security Controls

MyOS includes enterprise-grade security headers pre-configured in `next.config.ts`:

- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- **X-Frame-Options**: `DENY` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing)
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Content-Security-Policy (CSP)**: Restricts script sources, prevents unauthorized framing (`frame-ancestors 'none'`)
- **Permissions-Policy**: Restricts camera, microphone, and geolocation APIs: `camera=(), microphone=(), geolocation=()`

---

## 4. Post-Deployment Verification

Perform this manual smoke test on the live production URL:

1. **Authentication**:
   - Access `https://your-domain.com/today` in an incognito window.
   - Verify immediate redirect to `/login`.
   - Log in with owner credentials.
   - Verify arrival at `/today`.
2. **Core Workflows**:
   - Create a test task and mark it complete.
   - Create a test note.
   - Start a 25-minute Pomodoro session in `/focus`.
   - Create a calendar event in `/calendar`.
   - Create a reminder in `/reminders`.
3. **PWA & Offline**:
   - On iOS Safari / Chrome Android, tap **Add to Home Screen**.
   - Open MyOS from home screen. Verify standalone display mode without browser URL chrome.
   - Turn on Airplane mode. Navigate to `/offline`. Verify the offline fallback page renders smoothly.
4. **Push Notifications**:
   - Go to `/settings`.
   - Click **Enable Push Notifications**.
   - Accept the browser prompt.
   - Click **Send Test Notification**.
   - Verify native OS push banner appears.
5. **Logout**:
   - Click Sign Out.
   - Verify session cookies are cleared and user is redirected to `/login`.
