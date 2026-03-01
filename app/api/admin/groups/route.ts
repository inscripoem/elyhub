import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { z } from "zod"
import { eq } from "drizzle-orm"

const createGroupSchema = z
  .object({
    platform: z.enum(["qq", "wechat", "other"]),
    alias: z.string().min(1),
    qqNumber: z.string().optional(),
    joinLink: z.string().url().optional().or(z.literal("")),
    adminQq: z.string().optional(),
    useWorker: z.boolean().nullable().optional(),
  })
  .refine(
    (d) => d.platform !== "qq" || (d.qqNumber && d.qqNumber.length > 0),
    { message: "QQ number is required for QQ platform", path: ["qqNumber"] }
  )

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.select().from(groups).orderBy(groups.createdAt)
  return Response.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createGroupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { platform, alias, qqNumber, joinLink, adminQq, useWorker } =
    parsed.data

  const [row] = await db
    .insert(groups)
    .values({
      platform,
      alias,
      qqNumber: platform === "qq" ? qqNumber : undefined,
      joinLink: joinLink || undefined,
      adminQq: platform === "qq" ? adminQq : undefined,
      useWorker: useWorker ?? null,
    })
    .returning()

  return Response.json({ data: row }, { status: 201 })
}
