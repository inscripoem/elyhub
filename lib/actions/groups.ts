"use server"

import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

const groupFormSchema = z
  .object({
    platform: z.enum(["qq", "wechat", "other"]),
    alias: z.string().min(1, "别名不能为空"),
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
    qqNumber: z.string().optional(),
    joinLink: z.string().optional(),
    adminQq: z.string().optional(),
    useWorker: z.coerce.boolean().nullable().optional(),
    categoryId: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : v),
        z.string().uuid().nullable()
      )
      .optional(),
    expireAt: z.string().optional(),
  })
  .refine(
    (d) => d.platform !== "qq" || (d.qqNumber && d.qqNumber.trim().length > 0),
    { message: "QQ 群号不能为空", path: ["qqNumber"] }
  )

export async function createGroup(formData: FormData) {
  const session = await requireAdmin()
  if (!session) return { error: "Unauthorized" }

  const raw = {
    platform: formData.get("platform"),
    alias: formData.get("alias"),
    name: formData.get("name") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    qqNumber: formData.get("qqNumber") || undefined,
    joinLink: formData.get("joinLink") || undefined,
    adminQq: formData.get("adminQq") || undefined,
    categoryId: formData.get("categoryId") ?? null,
    useWorker:
      formData.get("useWorker") === "true"
        ? true
        : formData.get("useWorker") === "false"
          ? false
          : null,
    expireAt: formData.get("expireAt") || undefined,
  }

  const parsed = groupFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { platform, alias, name, avatarUrl, qqNumber, joinLink, adminQq, useWorker, categoryId, expireAt } =
    parsed.data

  await db.insert(groups).values({
    platform,
    alias,
    name: name || undefined,
    avatarUrl: avatarUrl || undefined,
    qqNumber: platform === "qq" ? qqNumber : undefined,
    joinLink: joinLink || undefined,
    adminQq: platform === "qq" ? adminQq : undefined,
    categoryId: categoryId ?? null,
    useWorker: useWorker ?? null,
    expireAt: expireAt ? new Date(expireAt) : undefined,
  })

  revalidatePath("/")
  revalidatePath("/admin/groups")
  return { success: true }
}

export async function updateGroup(id: string, formData: FormData) {
  const session = await requireAdmin()
  if (!session) return { error: "Unauthorized" }

  const raw = {
    platform: formData.get("platform"),
    alias: formData.get("alias"),
    name: formData.get("name") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    qqNumber: formData.get("qqNumber") || undefined,
    joinLink: formData.get("joinLink") || undefined,
    adminQq: formData.get("adminQq") || undefined,
    categoryId: formData.get("categoryId") ?? null,
    useWorker:
      formData.get("useWorker") === "true"
        ? true
        : formData.get("useWorker") === "false"
          ? false
          : null,
    expireAt: formData.get("expireAt") || undefined,
  }

  const parsed = groupFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { platform, alias, name, avatarUrl, qqNumber, joinLink, adminQq, useWorker, categoryId, expireAt } =
    parsed.data

  await db
    .update(groups)
    .set({
      platform,
      alias,
      name: name ?? null,
      avatarUrl: avatarUrl ?? null,
      qqNumber: platform === "qq" ? (qqNumber ?? null) : null,
      joinLink: joinLink || null,
      adminQq: platform === "qq" ? (adminQq ?? null) : null,
      categoryId: categoryId ?? null,
      useWorker: useWorker ?? null,
      expireAt: expireAt ? new Date(expireAt) : null,
    })
    .where(eq(groups.id, id))

  revalidatePath("/")
  revalidatePath("/admin/groups")
  return { success: true }
}

export async function deleteGroup(id: string) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  await db.delete(groups).where(eq(groups.id, id))

  revalidatePath("/")
  revalidatePath("/admin/groups")
}

export async function deleteGroups(ids: string[]) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const parsed = z.array(z.string().uuid()).min(1).max(100).safeParse(ids)
  if (!parsed.success) {
    return { error: "无效的群聊 ID 列表" }
  }

  const deleted = await db
    .delete(groups)
    .where(inArray(groups.id, parsed.data))
    .returning({ id: groups.id })

  revalidatePath("/")
  revalidatePath("/admin/groups")
  return { success: true, deletedCount: deleted.length }
}
