import { db } from "@/lib/db"
import { groupCategories, groups } from "@/db/schema"
import { and, eq, ilike, isNull } from "drizzle-orm"
import { getEffectiveStatus } from "@/lib/status"
import type { EffectiveStatus } from "@/lib/status"

export type GroupsExportFilters = {
  mode: "all" | "filtered"
  platform?: "qq" | "wechat" | "other" | "all"
  categoryId?: string
  search?: string
  status?: EffectiveStatus | "all"
}

export async function listGroupsForExport(filters: GroupsExportFilters) {
  const conditions = []

  if (filters.mode === "filtered") {
    if (filters.platform && filters.platform !== "all") {
      conditions.push(eq(groups.platform, filters.platform))
    }
    if (filters.categoryId === "none") {
      conditions.push(isNull(groups.categoryId))
    } else if (filters.categoryId && filters.categoryId !== "all") {
      conditions.push(eq(groups.categoryId, filters.categoryId))
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`
      conditions.push(ilike(groups.alias, q))
    }
  }

  const rows = await db
    .select({
      id: groups.id,
      platform: groups.platform,
      alias: groups.alias,
      name: groups.name,
      qqNumber: groups.qqNumber,
      joinLink: groups.joinLink,
      adminQq: groups.adminQq,
      avatarUrl: groups.avatarUrl,
      useWorker: groups.useWorker,
      expireAt: groups.expireAt,
      status: groups.status,
      categoryName: groupCategories.name,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .leftJoin(groupCategories, eq(groups.categoryId, groupCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(groups.createdAt)

  if (!filters.status || filters.status === "all") {
    return rows
  }

  const now = new Date()
  return rows.filter((r) => getEffectiveStatus(r, now) === filters.status)
}

export async function listCategoriesByName(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: groupCategories.id, name: groupCategories.name })
    .from(groupCategories)
  return new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]))
}
