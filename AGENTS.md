You are working on a project called MyOS.

MyOS is a private, single-user productivity application.

Read the entire repository before making changes.

Create an AGENTS.md file containing the project's engineering rules.

Architecture:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- PostgreSQL Row Level Security
- Zod
- React Hook Form
- Vitest
- Playwright
- pnpm

Engineering principles:
- Keep the application minimal and fast.
- Prefer Server Components.
- Use Client Components only when interactivity requires them.
- Avoid unnecessary dependencies.
- Never expose server secrets to the browser.
- Never use the Supabase service-role key client-side.
- Never bypass Row Level Security.
- Never trust user_id supplied by the client.
- User identity must come from the authenticated session.
- Every user-owned database table must have RLS.
- Mobile-first responsive design.
- Accessible UI.
- Keyboard-friendly desktop interactions.
- Avoid premature abstractions.
- Do not implement features that were not requested.
- Do not rewrite working code unnecessarily.

Before modifying code, inspect the existing implementation and explain the intended change briefly.

After implementing a feature:
1. Run type checking.
2. Run linting.
3. Run relevant tests.
4. Report failures honestly.

Do not silently disable tests or lint rules to make the build pass.
