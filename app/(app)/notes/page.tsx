import { redirect } from "next/navigation"
import { getNotesPageData } from "@/lib/notes/data"
import { NotesView } from "@/components/notes"

export const metadata = {
  title: "Notes",
  description: "Markdown notes with debounced autosave and split editor",
}

export default async function NotesPage() {
  const data = await getNotesPageData()

  if (!data) {
    redirect("/login")
  }

  const { notes, user } = data

  return <NotesView initialNotes={notes} user={user} />
}
