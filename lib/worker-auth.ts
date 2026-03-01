import { NextRequest } from "next/server"

export type WorkerPlatform = "qq" | "wechat"

type WorkerAuthOk = { ok: true; platform: WorkerPlatform }
type WorkerAuthFail = { ok: false; response: Response }
export type WorkerAuthResult = WorkerAuthOk | WorkerAuthFail

const PLATFORM_SECRETS: Record<WorkerPlatform, string | undefined> = {
  qq: process.env.QQ_WORKER_SECRET,
  wechat: process.env.WECHAT_WORKER_SECRET,
}

export function requireWorkerAuth(req: NextRequest): WorkerAuthResult {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  const token = authHeader.slice(7).trim()
  const platformHeader = req.headers.get("x-worker-platform")

  if (
    !platformHeader ||
    (platformHeader !== "qq" && platformHeader !== "wechat")
  ) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Missing or invalid X-Worker-Platform header",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  const platform = platformHeader as WorkerPlatform
  const secret = PLATFORM_SECRETS[platform]

  if (!secret || token !== secret) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Invalid token for platform" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  return { ok: true, platform }
}
