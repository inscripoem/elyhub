import { searchGroups } from "@/lib/repositories/groups-search"
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
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  const search = url.searchParams.get("search") ?? undefined
  const platform = url.searchParams.get("platform") ?? undefined
  const status = url.searchParams.get("status") ?? undefined

  const validPlatform =
    platform === "qq" || platform === "wechat" || platform === "other" || platform === "all"
      ? platform
      : undefined

  const validStatus =
    status === "ACTIVE" || status === "INVALID" || status === "UNKNOWN"
      ? status
      : undefined

  const { items } = await searchGroups({
    search,
    platform: validPlatform as "qq" | "wechat" | "other" | "all" | undefined,
    status: validStatus as "ACTIVE" | "INVALID" | "UNKNOWN" | undefined,
  })

  return Response.json({
    data: items.map(serializeGroup),
  })
}
