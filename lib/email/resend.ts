import "server-only"
import { Resend } from "resend"

let resendClient: Resend | null = null

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export type WaitlistNotificationOptions = {
  email: string
  ip?: string
  isDuplicate?: boolean
}

export type WaitlistNotificationResult = {
  success: boolean
  messageId?: string
  recipient?: string
  error?: string
}

export async function sendWaitlistNotification({
  email,
  ip,
  isDuplicate = false,
}: WaitlistNotificationOptions): Promise<WaitlistNotificationResult> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("RESEND_API_KEY is not defined. Skipping email notification.")
    return {
      success: false,
      error: "RESEND_API_KEY is not configured",
    }
  }

  const defaultFrom = "MyOS <onboarding@resend.dev>"
  const from = process.env.RESEND_FROM_EMAIL || defaultFrom
  const targetRecipient = process.env.WAITLIST_NOTIFY_EMAIL || "info@achhaya.com"

  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  })

  const subjectPrefix = isDuplicate ? "[Repeat Interest]" : "[New Invitation Request]"
  const subject = `${subjectPrefix} MyOS: ${email}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>New MyOS Invitation Request</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090909; color: #e5e5e5;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <div style="width: 28px; height: 28px; background-color: #1f1f1f; border: 1px solid #404040; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: #fff; text-align: center; line-height: 28px;">
              M
            </div>
            <span style="font-weight: 600; font-size: 16px; color: #ffffff; letter-spacing: -0.02em;">
              MyOS
            </span>
            <span style="font-size: 10px; font-family: monospace; background-color: #1c1917; color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">
              INVITATION REQUEST
            </span>
          </div>

          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #ffffff;">
            Someone showed interest in MyOS
          </h2>
          <p style="font-size: 14px; line-height: 1.5; color: #a3a3a3; margin: 0 0 20px 0;">
            A user entered their email to request access to your private operating system:
          </p>

          <div style="background-color: #0c0c0c; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="font-size: 11px; text-transform: uppercase; font-family: monospace; color: #737373;">Email Address</span>
              <p style="font-size: 16px; font-weight: 500; color: #38bdf8; margin: 4px 0 0 0;">
                <a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email}</a>
              </p>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #1f1f1f; padding-top: 12px; margin-top: 12px;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; font-family: monospace; color: #737373;">Time (IST)</span>
                <p style="font-size: 12px; color: #d4d4d4; margin: 4px 0 0 0; font-family: monospace;">${timestamp}</p>
              </div>
              ${
                ip
                  ? `<div>
                <span style="font-size: 11px; text-transform: uppercase; font-family: monospace; color: #737373;">Client IP</span>
                <p style="font-size: 12px; color: #d4d4d4; margin: 4px 0 0 0; font-family: monospace;">${ip}</p>
              </div>`
                  : ""
              }
            </div>
          </div>

          <div style="border-top: 1px solid #262626; padding-top: 16px;">
            <p style="font-size: 12px; color: #525252; margin: 0; font-family: monospace;">
              MyOS Private Notification · Delivered via Resend
            </p>
          </div>
        </div>
      </body>
    </html>
  `.trim()

  const text = `New MyOS Invitation Request\n\nEmail: ${email}\nTime: ${timestamp}${ip ? `\nClient IP: ${ip}` : ""}\nStatus: ${isDuplicate ? "Repeat Interest" : "New Request"}\n`

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [targetRecipient],
      subject,
      html,
      text,
    })

    if (!error && data?.id) {
      return { success: true, messageId: data.id, recipient: targetRecipient }
    }

    // If Resend returns 403 sandbox restriction (can only send to verified account email)
    if (error) {
      const isSandboxRestriction =
        error.name === "validation_error" &&
        (error.message.includes("can only send testing emails to your own email address") ||
          error.message.includes("verify a domain"))

      if (isSandboxRestriction) {
        // Extract the authorized testing email from the error message if possible
        const match = error.message.match(/\(([^)]+@resend\.dev|[^)]+@gmail\.com|[^)]+@[^)]+)\)/)
        const fallbackEmail = match?.[1]

        if (fallbackEmail && fallbackEmail !== targetRecipient) {
          console.warn(
            `Resend sandbox domain active. Forwarding notification to account owner: ${fallbackEmail}. To send directly to ${targetRecipient}, verify your domain at resend.com/domains.`
          )

          const retryResult = await resend.emails.send({
            from,
            to: [fallbackEmail],
            subject: `[Dev Sandbox] ${subject}`,
            html: `
              <div style="background-color: #291500; border: 1px solid #b45309; padding: 12px; border-radius: 6px; margin-bottom: 16px; color: #fef3c7; font-size: 13px;">
                <strong>Resend Sandbox Notice:</strong> Intended recipient was <code>${targetRecipient}</code>.
                Delivered to <code>${fallbackEmail}</code> because a custom domain has not yet been verified at resend.com/domains.
              </div>
              ${html}
            `,
            text: `[Resend Sandbox Notice: Intended recipient was ${targetRecipient}]\n\n${text}`,
          })

          if (!retryResult.error && retryResult.data?.id) {
            return {
              success: true,
              messageId: retryResult.data.id,
              recipient: fallbackEmail,
            }
          }
        }
      }

      console.error("Failed to send Resend email notification:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error("Unexpected error in sendWaitlistNotification:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
