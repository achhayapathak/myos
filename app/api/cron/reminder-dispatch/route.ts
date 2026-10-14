import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notificationService } from "@/lib/notifications/service"

export const dynamic = "force-dynamic"

/**
 * Scheduled Cron Handler for Reminder Notification Dispatch.
 * Picks up pending notification_deliveries whose scheduled_at <= now
 * and dispatches them via web push.
 *
 * Can be triggered via Vercel Cron, external webhook, or any scheduler.
 * Secures requests with CRON_SECRET if configured.
 */
export async function GET(request: Request) {
  return handleReminderDispatch(request)
}

export async function POST(request: Request) {
  return handleReminderDispatch(request)
}

async function handleReminderDispatch(request: Request) {
  // Verify CRON_SECRET if configured in environment
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization")
    const cronHeader = request.headers.get("x-cron-secret")
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (bearerSecret !== expectedSecret && cronHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Fetch pending deliveries whose scheduled_at has passed
  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!deliveries || deliveries.length === 0) {
    return NextResponse.json({ success: true, dispatched: 0, failed: 0 })
  }

  let dispatched = 0
  let failed = 0

  for (const delivery of deliveries) {
    try {
      const payload = (delivery.payload || {}) as Record<string, unknown>
      const title = (payload.title as string) || "Reminder"
      const body = (payload.body as string) || undefined

      const result = await notificationService.sendReminderPush(supabase, delivery.user_id, {
        reminderId: delivery.reminder_id || delivery.id,
        title,
        body,
        scheduledAt: delivery.scheduled_at,
      })

      // Update delivery status
      await supabase
        .from("notification_deliveries")
        .update({
          status: result.sentCount > 0 ? "delivered" : "failed",
          delivered_at: result.sentCount > 0 ? new Date().toISOString() : null,
          error_message: result.error || (result.failedCount > 0 ? "Delivery failed on some devices." : null),
        })
        .eq("id", delivery.id)

      if (result.sentCount > 0) {
        dispatched++
      } else {
        failed++
      }
    } catch (err) {
      // Mark as failed
      await supabase
        .from("notification_deliveries")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unexpected dispatch error.",
        })
        .eq("id", delivery.id)

      failed++
    }
  }

  return NextResponse.json({
    success: true,
    total: deliveries.length,
    dispatched,
    failed,
  })
}
