# MyOS — Environment Variables Documentation

This document provides a comprehensive guide to all environment variables used by MyOS across local development, staging, testing, and production environments.

---

## 1. Variable Summary Table

| Variable Name | Environment | Exposure | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Client & Server | **Yes** | HTTPS URL of your Supabase project instance |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Client & Server | **Yes** | Supabase anonymous public API key (safe for browser; RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production / Admin | **Server Only** | **Yes** (Server) | Supabase admin secret key. Bypasses RLS. Used only in admin scripts / migrations |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | All | Client & Server | Optional | VAPID P-256 public key (base64url) for Web Push subscriptions |
| `VAPID_PRIVATE_KEY` | All | **Server Only** | Optional | VAPID P-256 private key (base64url) for signing outgoing Web Push notifications |
| `VAPID_SUBJECT` | All | **Server Only** | Optional | Contact URI (`mailto:` or `https:`) sent to push services (RFC 8292) |
| `PLAYWRIGHT_BASE_URL` | Testing (E2E) | Node / CI | Optional | Target URL for Playwright tests (defaults to `http://localhost:3000`) |
| `E2E_TEST_EMAIL` | Testing (E2E) | Node / CI | Optional | Test user account email for automated E2E test runs |
| `E2E_TEST_PASSWORD` | Testing (E2E) | Node / CI | Optional | Test user account password for automated E2E test runs |

---

## 2. Security Boundaries & Scoping Rules

### Rule 1: The `NEXT_PUBLIC_` Prefix
- Next.js inlines variables prefixed with `NEXT_PUBLIC_` into the client-side JavaScript bundle during the build step.
- **Only** public metadata (such as your project's Supabase URL, public anon key, and VAPID public key) may use this prefix.
- Never prefix secret keys, credentials, or private keys with `NEXT_PUBLIC_`.

### Rule 2: Supabase Key Isolation
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design. It identifies the client to PostgREST and Supabase Auth. Every request using this key is evaluated against PostgreSQL **Row Level Security (RLS)** policies.
- `SUPABASE_SERVICE_ROLE_KEY` **completely bypasses PostgreSQL RLS**. It has unrestricted superuser privileges over your database.
  - **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
  - **NEVER** import modules using the service role key into Client Components.
  - Server actions and server components in MyOS use `@/lib/supabase/server.ts` with the user's session cookie, **NOT** the service role key.
  - The service role key is isolated to `@/lib/supabase/admin.ts`, which contains `import "server-only"` to guarantee compile-time rejection if bundled into client code.

### Rule 3: VAPID Web Push Key Isolation
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is needed in the browser to invoke `registration.pushManager.subscribe({ applicationServerKey })`.
- `VAPID_PRIVATE_KEY` signs outgoing notifications sent to Apple, Google FCM, or Mozilla Push Services. It is strictly kept on the server inside `@/lib/notifications/web-push-provider.ts`.

---

## 3. How to Generate Required Values

### Supabase Keys
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Navigate to **Project Settings** → **API**.
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys** → `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API Keys** → `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Web Push VAPID Keys
To generate a compliant P-256 ECDSA key pair for Web Push:
```bash
npx web-push generate-vapid-keys
```
Output:
```text
=======================================
Public Key:
BNc...<base64url>...
Private Key:
3x9...<base64url>...
=======================================
```
- Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the Public Key.
- Set `VAPID_PRIVATE_KEY` to the Private Key.
- Set `VAPID_SUBJECT` to `mailto:your-email@domain.com`.

---

## 4. Environment File Placement

- **Local Development**: Create `.env.local` by copying `.env.example`:
  ```bash
  cp .env.example .env.local
  ```
  `.env.local` is listed in `.gitignore` and is never committed to source control.
- **Production (Vercel)**:
  Set environment variables under **Project Settings** → **Environment Variables** in the Vercel dashboard.
- **CI / GitHub Actions**:
  Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_EMAIL`, and `E2E_TEST_PASSWORD` to repository secrets.
