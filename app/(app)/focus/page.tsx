import { redirect } from "next/navigation"
import { getFocusPageData } from "@/lib/focus/data"
import { FocusView } from "@/components/focus"

export const metadata = {
  title: "Focus",
  description: "Timestamp-backed Pomodoro focus engine with task integration",
}

export default async function FocusPage() {
  const data = await getFocusPageData()

  if (!data) {
    redirect("/login")
  }

  return <FocusView initialData={data} />
}
