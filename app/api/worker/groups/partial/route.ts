import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"
import { and, eq, isNull, or } from "drizzle-orm"

const WORKER_FIELDS = ["status", "name", "avatar_url", "join_link"] as const
type WorkerField = (typeof WORKER_FIELDS)[number]

const FIELD_COLUMN_MAP: Record<WorkerField, keyof typeof groups.$inferSelect> =
  {
    status: "status",
    name: "name",
    avatar_url: "avatarUrl",
    join_link: "joinLink",
  }

export async function GET(req: NextRequest) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const platform = req.nextUrl.searchParams.get("platform")
  if (platform !== auth.platform) {
    return Response.json({ error: "Platform mismatch" }, { status: 403 })
  }

  const missingParam = req.nextUrl.searchParams.get("missing") ?? ""
  const missingFields = missingParam
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is WorkerField =>
      WORKER_FIELDS.includes(f as WorkerField)
    )

  // Build OR condition: rows where any of the missing fields is null
  // status defaults to UNKNOWN (not null), so treat UNKNOWN as "needs update"
  const conditions = missingFields.map((field) => {
    const col = groups[FIELD_COLUMN_MAP[field] as keyof typeof groups]
    return isNull(col as Parameters<typeof isNull>[0])
  })

  const whereClause =
    conditions.length > 0
      ? and(eq(groups.platform, auth.platform), or(...conditions))
      : eq(groups.platform, auth.platform)

  const rows = await db.select().from(groups).where(whereClause)
  return Response.json({ data: rows })
}
