# MyOS — Technical Specification v0.1

## 1. Product definition

MyOS is a private, single-user productivity application designed for fast daily use across desktop and mobile.

### Core principles:

- **Fast** — minimal JavaScript and unnecessary network requests.
- **Minimal** — no feature bloat.
- **Private** — only the owner can authenticate and access data.
- **Mobile-first** — desktop and phone should both feel native.
- **Keyboard-friendly** — desktop workflows should be extremely fast.
- **AI-friendly architecture** — AI capabilities should be added without coupling the entire application to an LLM.

### v0.1 features
- Authentication
- Today dashboard
- Tasks
- Notes
- Pomodoro
- Calendar
- Reminders
- PWA
- Web notifications
- Dark/light mode
- Command palette
- Search
- Settings

### Explicitly out of scope
- Teams
- Sharing
- Public accounts
- Social features
- Chat
- Multiple organizations
- Complex permissions
- Native iOS/Android apps
- Subscriptions
- Billing
- Public APIs

---

## 2. Architecture

```text
                         ┌──────────────────┐
                         │      Browser     │
                         │                  │
                         │ Next.js React UI │
                         └────────┬─────────┘
                                  │
                           Authenticated
                              requests
                                  │
                 ┌────────────────▼────────────────┐
                 │             Vercel              │
                 │                                 │
                 │           Next.js               │
                 │                                 │
                 │  Server Components              │
                 │  Server Actions / Route APIs    │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │            Supabase             │
                 │                                 │
                 │  Auth                           │
                 │  PostgreSQL                     │
                 │  Row Level Security             │
                 │  Storage (future)               │
                 └─────────────────────────────────┘
```

### Important architectural decision

There is no separate Express/NestJS backend in v0.1.

Use Next.js server functionality wherever server-side logic is required.

---

## 3. Technology stack

| Area | Technology |
| --- | --- |
| **Framework** | Next.js |
| **Language** | TypeScript |
| **UI** | React |
| **Styling** | Tailwind CSS |
| **Components** | shadcn/ui |
| **Database** | PostgreSQL |
| **Backend platform** | Supabase |
| **Authentication** | Supabase Auth |
| **Authorization** | PostgreSQL RLS |
| **Validation** | Zod |
| **Forms** | React Hook Form |
| **Server state** | TanStack Query where useful |
| **Calendar** | FullCalendar |
| **Notes** | Markdown |
| **PWA** | Web App Manifest + Service Worker |
| **Notifications** | Web Push |
| **AI** | OpenAI API |
| **Hosting** | Vercel |
| **Source control** | GitHub |
| **Testing** | Vitest + Playwright |
| **Package manager** | pnpm |

> *Note:* Use `pnpm` throughout the project.

---

## 4. Application structure

Use the Next.js App Router.

```text
myos/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (app)/
│   │   ├── today/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── notes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── focus/
│   │   │   └── page.tsx
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── reminders/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── notifications/
│   │   └── ai/
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── today/
│   ├── tasks/
│   ├── notes/
│   ├── focus/
│   ├── calendar/
│   └── notifications/
│
├── lib/
│   ├── supabase/
│   ├── validations/
│   ├── notifications/
│   ├── ai/
│   └── utils/
│
├── hooks/
│   ├── use-todos.ts
│   ├── use-notes.ts
│   ├── use-pomodoro.ts
│   └── use-notifications.ts
│
├── types/
│   └── database.ts
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── public/
│   ├── icons/
│   └── manifest.webmanifest
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── .env.example
├── AGENTS.md
├── README.md
└── package.json
```

---

## 5. Navigation

### Desktop:

```text
┌────────────────────────────────────────────┐
│ MyOS                                       │
├──────────────┬─────────────────────────────┤
│              │                             │
│ Today        │                             │
│ Tasks        │       Application            │
│ Notes        │       Content                │
│ Focus        │                             │
│ Calendar     │                             │
│ Reminders    │                             │
│              │                             │
│ ─────────    │                             │
│ Settings     │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

### Mobile:

```text
┌──────────────────────────┐
│ MyOS                 ⋯   │
│                          │
│       Content            │
│                          │
├──────────────────────────┤
│ Today Tasks Focus Notes  │
└──────────────────────────┘
```

The mobile navigation should prioritize:
1. Today
2. Tasks
3. Focus
4. Notes

Calendar and Settings can be secondary navigation.

---

## 6. Database schema

Keep the schema deliberately boring.

### `profiles`
```sql
profiles
--------
id UUID PRIMARY KEY REFERENCES auth.users(id)
display_name TEXT
timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `tasks`
```sql
tasks
-----
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

title TEXT NOT NULL
description TEXT

status TEXT NOT NULL
priority TEXT NOT NULL DEFAULT 'medium'

due_at TIMESTAMPTZ
completed_at TIMESTAMPTZ

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Allowed status:**
- `todo`
- `in_progress`
- `completed`
- `cancelled`

**Priority:**
- `low`
- `medium`
- `high`

### `notes`
```sql
notes
-----
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

title TEXT NOT NULL
content TEXT NOT NULL DEFAULT ''

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Store Markdown.

### `events`
```sql
events
------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

title TEXT NOT NULL
description TEXT

start_at TIMESTAMPTZ NOT NULL
end_at TIMESTAMPTZ

all_day BOOLEAN NOT NULL DEFAULT false

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `pomodoro_sessions`
```sql
pomodoro_sessions
-----------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

type TEXT NOT NULL
duration_seconds INTEGER NOT NULL

started_at TIMESTAMPTZ NOT NULL
ended_at TIMESTAMPTZ

task_id UUID REFERENCES tasks(id)

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Types:**
- `focus`
- `short_break`
- `long_break`

### `reminders`
```sql
reminders
---------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

title TEXT NOT NULL
remind_at TIMESTAMPTZ NOT NULL

completed BOOLEAN NOT NULL DEFAULT false

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `push_subscriptions`
```sql
push_subscriptions
------------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)

endpoint TEXT NOT NULL
p256dh TEXT NOT NULL
auth TEXT NOT NULL

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Add a unique constraint on:
```sql
(user_id, endpoint)
```

---

## 7. Security model

This is non-negotiable.

Every user-owned table gets:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

And equivalent policies:

```sql
CREATE POLICY "Users can access their own tasks"
ON tasks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Same principle for:
- `notes`
- `events`
- `pomodoro_sessions`
- `reminders`
- `push_subscriptions`
- `profiles`

### Additional security requirements

Never:
- ❌ Expose service-role key
- ❌ Trust `user_id` supplied by client
- ❌ Disable RLS
- ❌ Perform unrestricted database queries
- ❌ Allow public registration

Server-side code should derive the user from the authenticated session.

---

## 8. Authentication

Only one account should exist.

### Login:
```text
Email
Password
[ Login ]
```

**No:**
- Sign up
- Public registration

**Support:**
- Login
- Logout
- Forgot password
- Session persistence

Optionally add MFA after the core application is working.

---

## 9. Today page

This is the primary screen.

```text
Good evening.

Monday, September 28

─────────────────────────────

TODAY

□ Finish payment implementation       HIGH
□ Review PR                           MEDIUM
□ Write technical blog               LOW

+ Add task

─────────────────────────────

FOCUS

25:00

[ Start Focus ]

─────────────────────────────

UPCOMING

10:30  Standup
14:00  Meeting
18:30  Gym

─────────────────────────────

QUICK NOTE

[ What's on your mind? ]
```

The page should aggregate data from:
- `tasks`
- `events`
- `pomodoro state`

---

## 10. Tasks

### Requirements:
- Create
- Edit
- Delete
- Complete
- Uncomplete
- Priority
- Due date
- Description
- Filtering
- Sorting
- Keyboard shortcuts

### Filters:
- All
- Today
- Upcoming
- Completed

---

## 11. Notes

V1 should be simple.

### Features:
- Create
- Edit
- Delete
- Search
- Markdown
- Autosave

### Layout:
```text
┌──────────────┬───────────────────────────┐
│ Notes        │ Note title                │
│              │                           │
│ + New note   │ # My note                 │
│              │                           │
│ Project      │ Some markdown content...  │
│ Ideas        │                           │
│ Learning     │                           │
└──────────────┴───────────────────────────┘
```

- Autosave should be debounced.
- Don't implement Notion-style blocks in v0.1.

---

## 12. Pomodoro

### Default:
- Focus: 25 min
- Short break: 5 min
- Long break: 15 min

User can configure these later.

### State machine:
```text
IDLE
 ↓
FOCUSING
 ↓
FOCUS_COMPLETE
 ↓
SHORT_BREAK
 ↓
BREAK_COMPLETE
 ↓
FOCUSING
```

### Important:

Don't store the countdown itself as the source of truth.

Store:
- `started_at`
- `duration`

Then calculate remaining time:

```text
remaining = duration - (current_time - started_at)
```

This prevents the timer from breaking when the browser sleeps or the phone locks.

---

## 13. Calendar

Start with an internal calendar.

### Views:
- Month
- Week
- Day

Create/edit/delete events.

Later you can add Google Calendar integration. Don't build Google Calendar sync into v0.1.

---

## 14. Notifications

### Architecture:

```text
Browser
   │
   │ subscribes
   ▼
push_subscriptions
   │
   ▼
reminders
   │
   ▼
scheduled worker
   │
   ▼
Web Push
   │
   ▼
Phone
```

### Notifications should support:
- Task reminder
- Calendar reminder
- Pomodoro completion
- Custom reminder

---

## 15. PWA requirements

`manifest.webmanifest`:

```yaml
name: MyOS
short_name: MyOS
display: standalone
start_url: /today
theme_color: ...
background_color: ...
icons: ...
```

### Requirements:
- Installable
- Standalone mode
- App icon
- Responsive
- Service worker
- Offline shell
- Cached static assets

Don't attempt full offline database synchronization in v0.1.

**Offline:**
- App shell → works
- Previously cached UI → works
- Database mutations → require connection

---

## 16. Performance requirements

### Target:
- Initial page load: fast
- Today page: minimal requests
- No giant client-side bundle
- No unnecessary polling
- No unnecessary global state

### Rules:
- Prefer Server Components.
- Use Client Components only when interactivity requires them.
- Don't fetch the same data multiple times.
- Don't introduce a state-management library unless necessary.
- Don't add dependencies without justification.

---

## 17. AI architecture

AI should live behind a small abstraction:

```text
lib/ai/
├── client.ts
├── prompts.ts
└── actions.ts
```

Never expose your OpenAI API key to the browser.

### Example:

```text
Browser
   ↓
Next.js server action
   ↓
OpenAI API
```

### Initial AI capabilities:

- **Natural language task:**
  `"Remind me tomorrow at 6 to deploy JoinUp"` → structured task.
- **Daily planning:**
  `"What should I focus on today?"` → tasks + calendar → AI → plan.
- **Note summarization:**
  `"Summarize this"`
- **Weekly review:**
  `"How productive was I this week?"`

Avoid building an AI chat interface initially.

---

## 18. Testing strategy

### Unit tests
Test:
- Pomodoro timer calculations
- Task validation
- Date/time handling
- Reminder scheduling logic
- AI structured-output parsing

### Integration tests
Test:
- Create task
- Update task
- Complete task
- Create note
- Create event
- Create reminder

### E2E tests
Critical path:
```text
Login
 ↓
Today
 ↓
Create task
 ↓
Complete task
 ↓
Create note
 ↓
Start Pomodoro
 ↓
Logout
```

### Security tests
Explicitly test:
- User A cannot read User B's task.
- Unauthenticated user cannot read tasks.
- User cannot modify another user's task by changing `user_id`.
- Service-role credentials never appear client-side.

---

## 19. Git strategy

Don't work directly on main.

### Use:

```text
main
 │
 ├── feature/auth
 ├── feature/tasks
 ├── feature/notes
 ├── feature/pomodoro
 └── feature/pwa
```

Each feature should:
```text
implement → test → review → commit → merge
```
