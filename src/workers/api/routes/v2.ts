import { createAssessmentPeriod, createUniversalCreditCaseFromCreateRequest } from "../../../../packages/domain/src"
import { createEntityId, stableHash } from "../../../../packages/shared/src"
import { listRatePacksV2 } from "../../../../packages/rates/src"
import { AddCaseEventRequestV2Schema, CreateCaseRequestV2Schema, CalculateAssessmentPeriodRequestV2Schema } from "../../../../packages/validation/src"
import { AppError } from "../../../lib/errors/AppError"
import { appendCaseEventV2, caseIdForAssessmentPeriod, getIdempotentResponse, loadCaseForAssessmentPeriod, putIdempotentResponse, saveCalculationArtifactV2, saveCaseV2 } from "../repositories/v2CaseRepository"
import { calculateAssessmentPeriodV2 } from "../services/v2CalculationService"
import { requireCaseAccess } from "../middleware/v2Access"
import type { Env } from "../types"

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

export async function handleV2Request(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/v2")) return null

  if (request.method === "GET" && url.pathname === "/api/v2/rate-packs") {
    const allowDraft = env.ENVIRONMENT !== "production"
    return json({
      ratePacks: listRatePacksV2().filter((pack) => allowDraft || pack.status === "approved").map((pack) => ({
        version: pack.version,
        status: pack.status,
        effectiveFrom: pack.effectiveFrom,
        effectiveTo: pack.effectiveTo,
        checksum: pack.checksum
      }))
    })
  }

  if (request.method === "GET" && url.pathname === "/api/v2/rate-packs/default") {
    const approved = listRatePacksV2().find((pack) => pack.status === "approved")
    if (!approved) throw new AppError("RATE_VERSION_NOT_FOUND", "No approved default rate pack is available.", 500)
    return json({
      version: approved.version,
      status: approved.status,
      effectiveFrom: approved.effectiveFrom,
      effectiveTo: approved.effectiveTo,
      checksum: approved.checksum
    })
  }

  if (request.method === "POST" && url.pathname === "/api/v2/cases") {
    const payload = CreateCaseRequestV2Schema.parse(await parseJson(request))
    const requestHash = stableHash(payload)
    const idempotent = await getIdempotentResponse(env, payload.clientRequestId, "POST /api/v2/cases", requestHash)
    if (idempotent) return json(idempotent, { status: 201 })

    const now = new Date().toISOString()
    const universalCreditCase = createUniversalCreditCaseFromCreateRequest(payload, now)
    const assessmentPeriod = createAssessmentPeriod({
      caseId: universalCreditCase.caseId,
      sequenceNumber: 1,
      startDate: payload.assessmentPeriod.startDate,
      endDate: payload.assessmentPeriod.endDate,
      sourceEvents: universalCreditCase.timeline.map((event) => event.eventId)
    })
    const access = await saveCaseV2(env, { universalCreditCase, assessmentPeriod, now })
    const response = {
      caseId: universalCreditCase.caseId,
      assessmentPeriodId: assessmentPeriod.assessmentPeriodId,
      caseSnapshotId: access.caseSnapshotId,
      accessToken: access.accessToken,
      tokenExpiresAt: access.tokenExpiresAt,
      status: universalCreditCase.status
    }
    await putIdempotentResponse(env, payload.clientRequestId, "POST /api/v2/cases", response, now, requestHash)
    return json(response, { status: 201 })
  }

  const eventMatch = url.pathname.match(/^\/api\/v2\/cases\/([^/]+)\/events$/)
  if (request.method === "POST" && eventMatch) {
    const caseId = decodeURIComponent(eventMatch[1])
    const accessResponse = await requireCaseAccess(env, request, url, caseId)
    if (accessResponse) return accessResponse

    const payload = AddCaseEventRequestV2Schema.parse(await parseJson(request))
    const route = `POST /api/v2/cases/${caseId}/events`
    const requestHash = stableHash(payload)
    const idempotent = await getIdempotentResponse(env, payload.clientRequestId, route, requestHash)
    if (idempotent) return json(idempotent, { status: 201 })

    const now = new Date().toISOString()
    const event = {
      eventId: createEntityId("event"),
      caseId,
      type: payload.eventType,
      occurredAt: payload.occurredAt,
      reportedAt: now,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      payload: payload.payload,
      evidenceRefs: payload.evidenceRefs
    }
    const sequenceNumber = await appendCaseEventV2(env, { caseId, event })
    const response = { eventId: event.eventId, sequenceNumber }
    await putIdempotentResponse(env, payload.clientRequestId, route, response, now, requestHash)
    return json(response, { status: 201 })
  }

  const calculateMatch = url.pathname.match(/^\/api\/v2\/assessment-periods\/([^/]+)\/calculate$/)
  if (request.method === "POST" && calculateMatch) {
    const assessmentPeriodId = decodeURIComponent(calculateMatch[1])
    const caseId = await caseIdForAssessmentPeriod(env, assessmentPeriodId)
    if (!caseId) throw new AppError("ASSESSMENT_NOT_FOUND", "Assessment period was not found.", 404)
    const accessResponse = await requireCaseAccess(env, request, url, caseId)
    if (accessResponse) return accessResponse

    const payload = CalculateAssessmentPeriodRequestV2Schema.parse(await parseJson(request))
    const route = `POST /api/v2/assessment-periods/${assessmentPeriodId}/calculate`
    const requestHash = stableHash(payload)
    const idempotent = await getIdempotentResponse(env, payload.clientRequestId, route, requestHash)
    if (idempotent) return json(idempotent)

    const loaded = await loadCaseForAssessmentPeriod(env, assessmentPeriodId)
    if (!loaded) throw new AppError("ASSESSMENT_NOT_FOUND", "Assessment period was not found.", 404)

    const now = new Date().toISOString()
    const calculation = calculateAssessmentPeriodV2({
      env,
      universalCreditCase: loaded.universalCreditCase,
      assessmentPeriod: loaded.assessmentPeriod,
      request: payload,
      now
    })
    await saveCalculationArtifactV2(env, {
      snapshot: calculation.snapshot,
      artifact: calculation.artifact,
      traces: calculation.traces,
      assumptions: calculation.response.assumptions,
      derivedArtifacts: calculation.response.derivedArtifacts,
      reduction: calculation.reduction,
      unsupportedCases: calculation.response.unsupportedCases
    })
    await putIdempotentResponse(env, payload.clientRequestId, route, calculation.response, now, requestHash)
    return json(calculation.response)
  }

  return json({ error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 })
}
