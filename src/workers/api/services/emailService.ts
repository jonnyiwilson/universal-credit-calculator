import type { Env } from "../types"

export async function sendReportEmail(env: Env, input: { recipientEmail: string; assessmentId: string }) {
  if (!env.RESEND_API_KEY) {
    return { status: "queued" as const, providerMessageId: undefined }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.REPORT_FROM_EMAIL ?? "Universal Credit assessment <reports@example.invalid>",
      to: input.recipientEmail,
      subject: "Your Universal Credit assessment report",
      text: `Your assessment report is ready. Reference: ${input.assessmentId}`
    })
  })

  if (!response.ok) {
    throw new Error(`Resend rejected email with status ${response.status}`)
  }

  const payload = (await response.json()) as { id?: string }
  return { status: "sent" as const, providerMessageId: payload.id }
}
