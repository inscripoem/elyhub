"use server"

import { db } from "@/lib/db"
import { groupCategories } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { asc, desc, eq, gt, lt, sql } from "drizzle-orm"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1, "分组名称不能为空"),
  description: z.string().optional(),
})

export async function createCategory(formData: FormData) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ max: sql<number>`coalesce(max(${groupCategories.sortOrder}), 0)` })
        .from(groupCategories)
      const nextSort = (row?.max ?? 0) + 1

      await tx.insert(groupCategories).values({
        name: parsed.data.name,
        description: parsed.data.description || null,
        sortOrder: nextSort,
      })
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("unique")) {
      return { error: "分组名称已存在，请使用其他名称" }
    }
    throw e
  }

  revalidatePath("/")
  revalidatePath("/admin/groups")
  revalidatePath("/admin/groups/categories")
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const idParsed = z.string().uuid().safeParse(id)
  if (!idParsed.success) return { error: "无效的分组 ID" }

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await db
      .update(groupCategories)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .where(eq(groupCategories.id, idParsed.data))
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("unique")) {
      return { error: "分组名称已存在，请使用其他名称" }
    }
    throw e
  }

  revalidatePath("/")
  revalidatePath("/admin/groups")
  revalidatePath("/admin/groups/categories")
  return { success: true }
}

export async function deleteCategory(id: string) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const idParsed = z.string().uuid().safeParse(id)
  if (!idParsed.success) return { error: "无效的分组 ID" }

  await db.delete(groupCategories).where(eq(groupCategories.id, idParsed.data))

  revalidatePath("/")
  revalidatePath("/admin/groups")
  revalidatePath("/admin/groups/categories")
  return { success: true }
}

export async function reorderCategories(orderedIds: string[]) {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const parsed = z.array(z.string().uuid()).safeParse(orderedIds)
  if (!parsed.success) return { error: "无效的分组 ID 列表" }

  await db.transaction(async (tx) => {
    for (let i = 0; i < parsed.data.length; i++) {
      await tx
        .update(groupCategories)
        .set({ sortOrder: i + 1 })
        .where(eq(groupCategories.id, parsed.data[i]))
    }
  })

  revalidatePath("/")
  revalidatePath("/admin/groups")
  revalidatePath("/admin/groups/categories")
  return { success: true }
}

export async function reorderCategory(id: string, direction: "up" | "down") {
  const session = await requireAdmin()
  if (!session) redirect("/admin/login")

  const idParsed = z.string().uuid().safeParse(id)
  if (!idParsed.success) return { error: "无效的分组 ID" }

  const dirParsed = z.enum(["up", "down"]).safeParse(direction)
  if (!dirParsed.success) return { error: "Invalid direction" }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(groupCategories)
      .where(eq(groupCategories.id, idParsed.data))
      .limit(1)

    if (!current) return

    const [neighbor] = await tx
      .select()
      .from(groupCategories)
      .where(
        dirParsed.data === "up"
          ? lt(groupCategories.sortOrder, current.sortOrder)
          : gt(groupCategories.sortOrder, current.sortOrder)
      )
      .orderBy(
        dirParsed.data === "up"
          ? desc(groupCategories.sortOrder)
          : asc(groupCategories.sortOrder)
      )
      .limit(1)

    if (!neighbor) return

    const tmpSort = -current.sortOrder - 1
    await tx
      .update(groupCategories)
      .set({ sortOrder: tmpSort })
      .where(eq(groupCategories.id, current.id))
    await tx
      .update(groupCategories)
      .set({ sortOrder: current.sortOrder })
      .where(eq(groupCategories.id, neighbor.id))
    await tx
      .update(groupCategories)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(groupCategories.id, current.id))
  })

  revalidatePath("/")
  revalidatePath("/admin/groups")
  revalidatePath("/admin/groups/categories")
  return { success: true }
}
