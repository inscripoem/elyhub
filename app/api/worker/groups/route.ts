import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const platform = req.nextUrl.searchParams.get("platform")
  if (platform !== auth.platform) {
    return Response.json({ error: "Platform mismatch" }, { status: 403 })
  }

  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.platform, auth.platform))

  return Response.json({ data: rows })
}
