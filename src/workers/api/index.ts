import { runUniversalCreditCalculation } from "../../domain/calculator"
import { getRatePack, listRatePacks } from "../../domain/rates"
import { CalculateAssessmentRequestSchema } from "../../domain/validation"
import { AppError } from "../../lib/errors/AppError"
import { getAssessment, saveAssessment } from "./repositories/assessmentRepository"
import { sendReportEmail } from "./services/emailService"
import { handleV2Request } from "./routes/v2"
import type { Env } from "./types"

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers
    }
  })
}

async function parseJson(request: Request) {
  try {
    return await request.json()
  } catch {
    throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON.", 400)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url)
      const v2Response = await handleV2Request(request, env, url)
      if (v2Response) return v2Response

      if (request.method === "GET" && url.pathname === "/api/rates") {
        return json({ rates: listRatePacks().map((rate) => ({ version: rate.version, effectiveFrom: rate.effectiveFrom, effectiveTo: rate.effectiveTo })) })
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/rates/")) {
        const version = decodeURIComponent(url.pathname.replace("/api/rates/", ""))
        return json(getRatePack(version))
      }

      if (request.method === "POST" && url.pathname === "/api/calculate") {
        if (env.ENVIRONMENT === "production") {
          throw new AppError("PROTOTYPE_CALCULATOR_DISABLED", "Prototype calculation routes are disabled in production.", 410)
        }
        const payload = CalculateAssessmentRequestSchema.parse(await parseJson(request))
        const calculation = runUniversalCreditCalculation(payload)
        return json(calculation)
      }

      if (request.method === "POST" && url.pathname === "/api/assessments") {
        if (env.ENVIRONMENT === "production") {
          throw new AppError("PROTOTYPE_CALCULATOR_DISABLED", "Prototype assessment routes are disabled in production.", 410)
        }
        const payload = CalculateAssessmentRequestSchema.parse(await parseJson(request))
        const calculation = runUniversalCreditCalculation(payload)
        const assessmentId = await saveAssessment(env, payload.input, payload.assessmentPeriod, calculation)
        return json({ assessmentId, ...calculation }, { status: 201 })
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/assessments/")) {
        const id = decodeURIComponent(url.pathname.replace("/api/assessments/", "").split("/")[0])
        const assessment = await getAssessment(env, id)
        if (!assessment) throw new AppError("ASSESSMENT_NOT_FOUND", "Assessment was not found.", 404)
        return json(assessment)
      }

      if (request.method === "POST" && url.pathname.match(/^\/api\/assessments\/[^/]+\/email-report$/)) {
        const id = decodeURIComponent(url.pathname.split("/")[3])
        const payload = (await parseJson(request)) as { recipientEmail?: string; consentToEmail?: boolean }
        if (!payload.recipientEmail || payload.consentToEmail !== true) {
          throw new AppError("VALIDATION_FAILED", "Recipient email and consent are required.", 400)
        }
        const delivery = await sendReportEmail(env, { recipientEmail: payload.recipientEmail, assessmentId: id })
        return json({ status: delivery.status, eventId: crypto.randomUUID() })
      }

      return json({ error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 })
    } catch (error) {
      if (error instanceof AppError) {
        return json({ error: { code: error.code, message: error.message } }, { status: error.status })
      }
      if (error instanceof Error && error.name === "ZodError") {
        return json({ error: { code: "VALIDATION_FAILED", message: "Request validation failed." } }, { status: 400 })
      }
      return json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } }, { status: 500 })
    }
  }
}
