import { redirect } from "next/navigation"
import { getTodayDashboardData } from "@/lib/today-data"
import {
  TodayHeader,
  TasksDueToday,
  TodayHabits,
  TodayReminders,
  UpcomingEvents,
  FocusStatusCard,
  QuickTaskForm,
  QuickNoteForm,
} from "@/components/today"

export const metadata = {
  title: "Today",
  description: "Primary daily productivity overview and dashboard",
}

export default async function TodayPage() {
  const data = await getTodayDashboardData()

  if (!data) {
    redirect("/login")
  }

  const {
    bounds,
    tasksDueToday,
    reminders,
    completedTasksTodayCount,
    upcomingEvents,
    focusSummary,
    habitsSummary,
  } = data

  const pendingDueCount = tasksDueToday.filter((t) => t.status !== "completed").length
  const pendingRemindersCount = reminders.filter((r) => !r.completed).length

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header with greeting, formatted date, and metric summary */}
      <TodayHeader
        displayName="master"
        formattedDate={bounds.formattedDate}
        greeting={bounds.greeting}
        timeZone="Asia/Kolkata"
        pendingDueCount={pendingDueCount}
        remindersCount={pendingRemindersCount}
        completedTodayCount={completedTasksTodayCount}
        focusMinutesToday={focusSummary.totalFocusMinutesToday}
      />

      {/* 2. Responsive Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Primary Left Column: Quick Capture, Tasks & Habits */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Quick Task Creation */}
          <QuickTaskForm />

          {/* Tasks Due Today */}
          <TasksDueToday
            tasks={tasksDueToday}
            startISO={bounds.startISO}
            endISO={bounds.endISO}
            timeZone={bounds.timeZone}
          />

          {/* Habits Section on Today Dashboard */}
          <TodayHabits
            initialHabits={habitsSummary?.habits || []}
            todayDate={bounds.dateStr}
            completedCount={habitsSummary?.completedCount || 0}
            totalCount={habitsSummary?.totalCount || 0}
            timeZone={bounds.timeZone}
          />

          {/* Reminders Section */}
          <TodayReminders
            initialReminders={reminders}
            timeZone={bounds.timeZone}
          />
        </div>

        {/* Companion Right Column: Quick Note, Focus Status & Upcoming Schedule */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Quick Note / Scratchpad Creation */}
          <QuickNoteForm />

          {/* Pomodoro & Focus Status */}
          <FocusStatusCard summary={focusSummary} />

          {/* Upcoming Calendar Events */}
          <UpcomingEvents
            events={upcomingEvents}
            timeZone={bounds.timeZone}
          />
        </div>
      </div>
    </div>
  )
}
