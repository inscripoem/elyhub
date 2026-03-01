import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "INVALID", "UNKNOWN"]).optional(),
  name: z.string().optional().or(z.null()),
  avatarUrl: z.string().optional().or(z.null()),
  joinLink: z.string().optional().or(z.null()),
  expireAt: z.string().datetime().optional().or(z.null()),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const updates: Partial<typeof groups.$inferInsert> = {}
  const data = parsed.data

  if (data.status !== undefined) updates.status = data.status
  if ("name" in data) updates.name = data.name ?? null
  if ("avatarUrl" in data) updates.avatarUrl = data.avatarUrl ?? null
  if ("joinLink" in data) updates.joinLink = data.joinLink ?? null
  if ("expireAt" in data)
    updates.expireAt = data.expireAt ? new Date(data.expireAt) : null

  // Ensure worker can only update groups that belong to its platform
  const [row] = await db
    .update(groups)
    .set(updates)
    .where(and(eq(groups.id, id), eq(groups.platform, auth.platform)))
    .returning()

  if (!row) {
    return Response.json({ error: "Not found or platform mismatch" }, { status: 404 })
  }
  return Response.json({ data: row })
}
