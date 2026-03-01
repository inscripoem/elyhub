import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { z } from "zod"
import { eq } from "drizzle-orm"

const updateGroupSchema = z.object({
  alias: z.string().min(1).optional(),
  qqNumber: z.string().optional(),
  joinLink: z.string().url().optional().or(z.literal("")).or(z.null()),
  adminQq: z.string().optional().or(z.null()),
  useWorker: z.boolean().nullable().optional(),
  expireAt: z.string().datetime().optional().or(z.null()),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const [row] = await db.select().from(groups).where(eq(groups.id, id))
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({ data: row })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateGroupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const updates: Partial<typeof groups.$inferInsert> = {}
  const data = parsed.data

  if (data.alias !== undefined) updates.alias = data.alias
  if (data.qqNumber !== undefined) updates.qqNumber = data.qqNumber
  if ("joinLink" in data) updates.joinLink = data.joinLink ?? null
  if ("adminQq" in data) updates.adminQq = data.adminQq ?? null
  if ("useWorker" in data) updates.useWorker = data.useWorker ?? null
  if ("expireAt" in data)
    updates.expireAt = data.expireAt ? new Date(data.expireAt) : null

  const [row] = await db
    .update(groups)
    .set(updates)
    .where(eq(groups.id, id))
    .returning()

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({ data: row })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const [row] = await db
    .delete(groups)
    .where(eq(groups.id, id))
    .returning({ id: groups.id })

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({ data: { id: row.id } })
}
