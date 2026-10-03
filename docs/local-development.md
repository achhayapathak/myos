# MyOS — Local Development Guide

This guide walks you through setting up and running MyOS on your local development machine.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v20.x or later (LTS recommended)
- **pnpm**: v9.x or later (`npm install -g pnpm`)
- **Git**: v2.x or later
- **PostgreSQL / Supabase CLI** (optional for local database container)

---

## 2. Initial Setup

### Step 2.1: Clone the Repository
```bash
git clone <repository-url>
cd work
```

### Step 2.2: Install Dependencies
```bash
pnpm install
```

### Step 2.3: Configure Environment Variables
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
*(See `docs/environment-variables.md` for full details.)*

### Step 2.4: Verify Database Connection
Run the connection check script:
```bash
node scripts/check-supabase.mjs
```

---

## 3. Running the Development Server

Start the Next.js development server with Turbopack:
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- You will be redirected to `/login` if unauthenticated.
- Once authenticated, you will be taken to `/today`.

---

## 4. Testing & Verification Commands

Always run verification before committing changes:

| Command | Description |
| :--- | :--- |
| `pnpm run test` | Runs the full Vitest suite (390+ unit, integration, and security tests) |
| `pnpm run test:unit` | Runs unit tests only (`tests/unit/**/*.test.ts`) |
| `pnpm run test:integration` | Runs integration tests only (`tests/integration/**/*.test.ts`) |
| `pnpm run test:e2e` | Runs Playwright E2E browser tests across Desktop Chrome and Mobile iPhone |
| `pnpm run test:e2e:ui` | Opens Playwright interactive UI test runner |
| `pnpm run typecheck` | Runs `tsc --noEmit` to verify TypeScript types |
| `pnpm run lint` | Runs ESLint with Next.js and React configurations |
| `pnpm run build` | Builds the optimized Next.js production bundle with Turbopack |

---

## 5. Mobile & PWA Testing

### Mobile Viewport Emulation
- Open Chrome DevTools (`Cmd + Option + I` on Mac).
- Toggle Device Toolbar (`Cmd + Shift + M`).
- Test standard widths:
  - `320px` (Minimum supported width)
  - `375px` (iPhone SE)
  - `390px` (iPhone 13 / 14 / 15)
  - `430px` (iPhone Pro Max)
  - `768px` (iPad / Tablet)

### Offline & Service Worker Testing
- Open DevTools → **Application** tab → **Service Workers**.
- Verify `sw.js` is registered and active.
- Check "Offline" checkbox and refresh: MyOS should serve the offline fallback page (`/offline`).

---

## 6. Architecture & Code Structure

```text
├── app/                  # Next.js App Router (pages, layouts, route handlers)
│   ├── (app)/            # Authenticated protected application routes
│   │   ├── today/        # Daily dashboard view
│   │   ├── tasks/        # Task management & quick-add
│   │   ├── notes/        # Markdown notes
│   │   ├── calendar/     # Calendar & scheduling (UTC-based)
│   │   ├── reminders/    # Reminders & push notification triggers
│   │   ├── focus/        # Pomodoro timer & session tracking
│   │   └── settings/     # Account, notifications & display preferences
│   ├── (auth)/           # Authentication routes (login, forgot-password, reset)
│   ├── auth/callback/    # OAuth & magic-link callback handler
│   ├── manifest.ts       # Web app manifest generator
│   └── layout.tsx        # Root HTML layout with PWA and Theme providers
├── components/           # Reusable React components (shadcn/ui + custom)
├── lib/                  # Business logic, helpers, and Supabase clients
│   ├── supabase/         # Client, Server, and Admin Supabase factory functions
│   ├── notifications/    # Web Push delivery & validation abstraction
│   └── calendar/         # Timezone utilities and date computations
├── public/               # Static assets, icons, and sw.js service worker
├── supabase/             # Database migrations and seed files
├── tests/                # Unit, integration, security, and E2E test suites
└── docs/                 # Production deployment and architecture documentation
```
