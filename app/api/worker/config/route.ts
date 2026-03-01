import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { settings } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"

export async function GET(req: NextRequest) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const [row] = await db.select().from(settings).limit(1)

  const enabled =
    auth.platform === "qq"
      ? (row?.qqWorkerEnabled ?? false)
      : (row?.wechatWorkerEnabled ?? false)

  return Response.json({
    platform: auth.platform,
    enabled,
  })
}
