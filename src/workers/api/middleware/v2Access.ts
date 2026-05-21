import { validateCaseAccessToken } from "../repositories/v2CaseRepository"
import type { Env } from "../types"

export function extractAccessToken(request: Request, url: URL): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()
  return url.searchParams.get("access_token")
}

export async function requireCaseAccess(env: Env, request: Request, url: URL, caseId: string): Promise<Response | null> {
  const token = extractAccessToken(request, url)
  if (!token) {
    return unauthorized("Access token is required.")
  }
  const ok = await validateCaseAccessToken(env, caseId, token, new Date().toISOString())
  if (!ok) {
    return unauthorized("Access token is invalid, expired, or revoked.")
  }
  return null
}

function unauthorized(message: string) {
  return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message } }), {
    status: 401,
    headers: { "content-type": "application/json" }
  })
}
