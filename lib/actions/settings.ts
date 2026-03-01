"use server"

import { db } from "@/lib/db"
import { settings } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { z } from "zod"

const settingsSchema = z.object({
  siteTitle: z.string().min(1, "网站名称不能为空"),
  siteAvatarUrl: z.string().url().optional().or(z.literal("")),
  qqWorkerEnabled: z.coerce.boolean(),
  wechatWorkerEnabled: z.coerce.boolean(),
})

export async function updateSettings(formData: FormData) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const parsed = settingsSchema.safeParse({
    siteTitle: formData.get("siteTitle"),
    siteAvatarUrl: formData.get("siteAvatarUrl") || "",
    qqWorkerEnabled: formData.get("qqWorkerEnabled") === "true",
    wechatWorkerEnabled: formData.get("wechatWorkerEnabled") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const [existing] = await db.select().from(settings).limit(1)
  if (!existing) return { error: "Settings not found" }

  await db
    .update(settings)
    .set({
      siteTitle: parsed.data.siteTitle,
      siteAvatarUrl: parsed.data.siteAvatarUrl || null,
      qqWorkerEnabled: parsed.data.qqWorkerEnabled,
      wechatWorkerEnabled: parsed.data.wechatWorkerEnabled,
    })
    .where(eq(settings.id, existing.id))

  revalidatePath("/")
  revalidatePath("/admin/settings")
  return { success: true }
}
