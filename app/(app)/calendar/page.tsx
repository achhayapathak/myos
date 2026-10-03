import { redirect } from "next/navigation"
import { getCalendarPageData } from "@/lib/calendar/data"
import { CalendarView } from "@/components/calendar"

export const metadata = {
  title: "Calendar",
  description: "Schedule, commitments, and calendar event management",
}

export default async function CalendarPage() {
  const data = await getCalendarPageData()

  if (!data) {
    redirect("/login")
  }

  return (
    <CalendarView
      initialEvents={data.events}
      timeZone={data.timeZone}
    />
  )
}
