import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { settings } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { z } from "zod"
import { eq } from "drizzle-orm"

const updateSettingsSchema = z.object({
  siteTitle: z.string().min(1).optional(),
  siteAvatarUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  qqWorkerEnabled: z.boolean().optional(),
  wechatWorkerEnabled: z.boolean().optional(),
})

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [row] = await db.select().from(settings).limit(1)
  return Response.json({ data: row ?? null })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const [existing] = await db.select().from(settings).limit(1)
  if (!existing) {
    return Response.json({ error: "Settings not initialized" }, { status: 404 })
  }

  const [row] = await db
    .update(settings)
    .set(parsed.data)
    .where(eq(settings.id, existing.id))
    .returning()

  return Response.json({ data: row })
}
