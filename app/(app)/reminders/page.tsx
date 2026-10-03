import { redirect } from "next/navigation"
import { getRemindersPageData } from "@/lib/reminders/data"
import { RemindersView } from "@/components/reminders"

export const metadata = {
  title: "Reminders",
  description: "Time-based alerts and scheduled task reminders",
}

export default async function RemindersPage() {
  const data = await getRemindersPageData()

  if (!data) {
    redirect("/login")
  }

  return (
    <RemindersView
      initialReminders={data.reminders}
      timeZone={data.timeZone}
    />
  )
}
