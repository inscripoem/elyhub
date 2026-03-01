import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const batchItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "INVALID", "UNKNOWN"]).optional(),
  name: z.string().optional().or(z.null()),
  avatarUrl: z.string().optional().or(z.null()),
  joinLink: z.string().optional().or(z.null()),
  expireAt: z.string().datetime().optional().or(z.null()),
})

const batchSchema = z.array(batchItemSchema).min(1).max(100)

export async function POST(req: NextRequest) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const body = await req.json()
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const results = await db.transaction(async (tx) => {
    const updated: string[] = []
    const notFound: string[] = []

    for (const item of parsed.data) {
      const updates: Partial<typeof groups.$inferInsert> = {}
      if (item.status !== undefined) updates.status = item.status
      if ("name" in item) updates.name = item.name ?? null
      if ("avatarUrl" in item) updates.avatarUrl = item.avatarUrl ?? null
      if ("joinLink" in item) updates.joinLink = item.joinLink ?? null
      if ("expireAt" in item)
        updates.expireAt = item.expireAt ? new Date(item.expireAt) : null

      const [row] = await tx
        .update(groups)
        .set(updates)
        .where(and(eq(groups.id, item.id), eq(groups.platform, auth.platform)))
        .returning({ id: groups.id })

      if (row) {
        updated.push(row.id)
      } else {
        notFound.push(item.id)
      }
    }

    return { updated, notFound }
  })

  return Response.json({ ok: true, ...results })
}
