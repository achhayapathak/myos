import { redirect } from "next/navigation"
import { getHabitsPageData } from "@/lib/habits/queries"
import { HabitList } from "@/components/habits"

export const metadata = {
  title: "Habits — MyOS",
  description: "Track daily consistency, habits, and streaks",
}

export default async function HabitsPage() {
  const data = await getHabitsPageData()

  if (!data) {
    redirect("/login")
  }

  return <HabitList initialData={data} />
}
