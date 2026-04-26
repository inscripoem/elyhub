import { requireAdmin } from "@/lib/auth-server"
import { searchGroupsPaginated } from "@/lib/repositories/groups-search"
import type { Group } from "@/db/schema"

function serializeGroup(row: Group) {
  return {
    id: row.id,
    categoryId: row.categoryId ?? null,
    platform: row.platform,
    alias: row.alias,
    name: row.name ?? null,
    qqNumber: row.qqNumber ?? null,
    joinLink: row.joinLink ?? null,
    adminQq: row.adminQq ?? null,
    status: row.status,
    expireAt: row.expireAt?.toISOString() ?? null,
    avatarUrl: row.avatarUrl ?? null,
    useWorker: row.useWorker ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  }
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)

  const search = url.searchParams.get("search") ?? undefined
  const platform = url.searchParams.get("platform") ?? undefined
  const categoryId = url.searchParams.get("categoryId") ?? undefined
  const status = url.searchParams.get("status") ?? undefined
  const page = parseInt(url.searchParams.get("page") ?? "1", 10)
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10)

  // Validate enums
  const validPlatform =
    platform === "qq" || platform === "wechat" || platform === "other" || platform === "all"
      ? platform
      : undefined

  const validStatus =
    status === "ACTIVE" || status === "INVALID" || status === "UNKNOWN"
      ? status
      : undefined

  const result = await searchGroupsPaginated({
    search,
    platform: validPlatform as "qq" | "wechat" | "other" | "all" | undefined,
    categoryId,
    status: validStatus as "ACTIVE" | "INVALID" | "UNKNOWN" | undefined,
    page,
    pageSize,
  })

  return Response.json({
    data: result.items.map(serializeGroup),
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  })
}
