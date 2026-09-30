import { redirect } from "next/navigation"
import { getTasksPageData } from "@/lib/tasks/data"
import { TasksView } from "@/components/tasks"

export const metadata = {
  title: "Tasks",
  description: "Task management with priorities, due dates, statuses, and filtering",
}

export default async function TasksPage() {
  const data = await getTasksPageData()

  if (!data) {
    redirect("/login")
  }

  const { tasks, bounds, timeZone, user } = data

  return (
    <TasksView
      initialTasks={tasks}
      startISO={bounds.startISO}
      endISO={bounds.endISO}
      timeZone={timeZone}
      user={user}
    />
  )
}
