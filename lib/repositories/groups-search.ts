import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm"
import type { Group } from "@/db/schema"
import type { EffectiveStatus } from "@/lib/status"

export type GroupSearchFilters = {
  search?: string
  platform?: "qq" | "wechat" | "other" | "all"
  categoryId?: string | "all" | "none"
  status?: EffectiveStatus | "all"
  page?: number
  pageSize?: number
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 构建有效状态的 SQL 表达式。
 *
 * 当群的 expireAt 过期时，不同平台的展示状态降级规则不同。
 * 此表达式用于在数据库查询层面对有效状态进行筛选，确保后端分页准确。
 *
 * ⚠️ 重要：此规则与 lib/status.ts 中的 EXPIRED_STATUS_MAP / getEffectiveStatus()
 *    必须保持完全一致。若修改此处规则，需同步修改 lib/status.ts。
 *
 * TODO: 未来考虑使用 PostgreSQL generated column `effective_status` 替代
 *       此 SQL 表达式，将规则下沉到 schema 层，彻底消除前后端两份实现。
 */
function buildEffectiveStatusExpr() {
  return sql<string>`
    CASE
      WHEN ${groups.expireAt} IS NULL OR ${groups.expireAt} > NOW() THEN ${groups.status}
      WHEN ${groups.platform} = 'qq' THEN 'UNKNOWN'
      ELSE 'INVALID'
    END
  `
}

function buildWhereConditions(filters: GroupSearchFilters) {
  const conditions = []

  // 模糊搜索：alias / name / qqNumber
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`
    conditions.push(
      or(
        ilike(groups.alias, q),
        ilike(groups.name, q),
        ilike(groups.qqNumber, q)
      )
    )
  }

  // 平台筛选
  if (filters.platform && filters.platform !== "all") {
    conditions.push(eq(groups.platform, filters.platform))
  }

  // 分组筛选
  if (filters.categoryId === "none") {
    conditions.push(isNull(groups.categoryId))
  } else if (filters.categoryId && filters.categoryId !== "all") {
    conditions.push(eq(groups.categoryId, filters.categoryId))
  }

  // 状态筛选（使用有效状态 SQL 表达式）
  if (filters.status && filters.status !== "all") {
    const effectiveStatus = buildEffectiveStatusExpr()
    conditions.push(sql`${effectiveStatus} = ${filters.status}`)
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

/**
 * 搜索群聊（不分页）。
 * 供公开首页、Worker API 使用。
 */
export async function searchGroups(
  filters: GroupSearchFilters
): Promise<{ items: Group[]; total: number }> {
  const where = buildWhereConditions(filters)

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(groups)
      .where(where)
      .orderBy(desc(groups.createdAt)),
    db
      .select({ total: count() })
      .from(groups)
      .where(where),
  ])

  return {
    items,
    total: countResult[0]?.total ?? 0,
  }
}

/**
 * 搜索群聊（分页）。
 * 供管理后台表格使用。
 */
export async function searchGroupsPaginated(
  filters: GroupSearchFilters
): Promise<PaginatedResult<Group>> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const where = buildWhereConditions(filters)

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(groups)
      .where(where)
      .orderBy(desc(groups.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(groups)
      .where(where),
  ])

  const total = countResult[0]?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  }
}
