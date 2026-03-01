import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { and, eq, isNull, or } from "drizzle-orm"

export type GroupSelect = typeof groups.$inferSelect
export type GroupInsert = typeof groups.$inferInsert

const WORKER_FIELD_MAP = {
  status:     groups.status,
  name:       groups.name,
  avatar_url: groups.avatarUrl,
  join_link:  groups.joinLink,
} as const

export async function listGroupsByPlatform(
  platform: GroupInsert["platform"]
): Promise<GroupSelect[]> {
  return db.select().from(groups).where(eq(groups.platform, platform))
}

export async function listGroupsWithMissingFields(
  platform: GroupInsert["platform"],
  fields: string[]
): Promise<GroupSelect[]> {
  const conditions = fields
    .filter((f): f is keyof typeof WORKER_FIELD_MAP => f in WORKER_FIELD_MAP)
    .map((f) => isNull(WORKER_FIELD_MAP[f]))
  return db.select().from(groups).where(
    conditions.length
      ? and(eq(groups.platform, platform), or(...conditions))
      : eq(groups.platform, platform)
  )
}

export async function updateGroupByPlatform(
  id: string,
  platform: GroupInsert["platform"],
  data: Partial<GroupInsert>
): Promise<GroupSelect | null> {
  const [row] = await db
    .update(groups)
    .set(data)
    .where(and(eq(groups.id, id), eq(groups.platform, platform)))
    .returning()
  return row ?? null
}

export async function batchUpdateGroupsByPlatform(
  platform: GroupInsert["platform"],
  items: Array<{ id: string } & Partial<GroupInsert>>
): Promise<{ updated: string[]; notFound: string[] }> {
  return db.transaction(async (tx) => {
    const updated: string[] = []
    const notFound: string[] = []
    for (const { id, ...data } of items) {
      const [row] = await tx
        .update(groups)
        .set(data)
        .where(and(eq(groups.id, id), eq(groups.platform, platform)))
        .returning({ id: groups.id })
      row ? updated.push(row.id) : notFound.push(id)
    }
    return { updated, notFound }
  })
}
