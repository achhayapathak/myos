"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import type { Task, TaskStatus, TaskUpdate } from "@/types/database"
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
} from "@/lib/tasks/validations"

export interface TaskActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action to create a new task.
 * Authorization: strictly enforced by session-derived user ID.
 * Validation: strictly parsed with Zod.
 */
export async function createTask(
  rawInput: unknown
): Promise<TaskActionResponse<Task>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = createTaskSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid task input."
    return { success: false, error: firstError }
  }

  const { title, description, priority, status, due_at } = parseResult.data
  const completed_at = status === "completed" ? new Date().toISOString() : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id, // Strictly server-derived, never trust client input
      title,
      description,
      priority,
      status,
      due_at,
      completed_at,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true, data }
}

/**
 * Server Action to update an existing task.
 * User ownership is strictly verified on both the filter and session.
 */
export async function updateTask(
  rawInput: unknown
): Promise<TaskActionResponse<Task>> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const parseResult = updateTaskSchema.safeParse(rawInput)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Invalid task update data."
    return { success: false, error: firstError }
  }

  const { id, title, description, priority, status, due_at } = parseResult.data

  const updatePayload: TaskUpdate = {}
  if (title !== undefined) updatePayload.title = title
  if (description !== undefined) updatePayload.description = description
  if (priority !== undefined) updatePayload.priority = priority
  if (due_at !== undefined) updatePayload.due_at = due_at

  if (status !== undefined) {
    updatePayload.status = status
    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString()
    } else {
      updatePayload.completed_at = null
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id) // Security constraint: cannot touch another user's task
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true, data }
}

/**
 * Server Action to delete a task.
 */
export async function deleteTask(
  taskId: string
): Promise<TaskActionResponse<void>> {
  if (!taskId || typeof taskId !== "string") {
    return { success: false, error: "Task ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to mark a task as completed.
 */
export async function completeTask(
  taskId: string
): Promise<TaskActionResponse<void>> {
  if (!taskId || typeof taskId !== "string") {
    return { success: false, error: "Task ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to reopen a completed/cancelled task back to todo.
 */
export async function reopenTask(
  taskId: string
): Promise<TaskActionResponse<void>> {
  if (!taskId || typeof taskId !== "string") {
    return { success: false, error: "Task ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "todo",
      completed_at: null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to change a task to any valid status.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<TaskActionResponse<void>> {
  const statusCheck = taskStatusSchema.safeParse(newStatus)
  if (!statusCheck.success) {
    return { success: false, error: "Invalid task status." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const completedAt = newStatus === "completed" ? new Date().toISOString() : null

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      status: newStatus,
      completed_at: completedAt,
    })
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true }
}

/**
 * Server Action to toggle a task status between completed and todo.
 */
export async function toggleTaskStatus(
  taskId: string,
  currentStatus: TaskStatus
): Promise<TaskActionResponse<{ nextStatus: TaskStatus }>> {
  if (!taskId) {
    return { success: false, error: "Task ID is required." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Active session required." }
  }

  const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed"
  const completedAt = nextStatus === "completed" ? new Date().toISOString() : null

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      completed_at: completedAt,
    })
    .eq("id", taskId)
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/tasks")
  revalidatePath("/today")

  return { success: true, data: { nextStatus } }
}
