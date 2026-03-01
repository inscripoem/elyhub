import { db } from "@/lib/db"
import { settings } from "@/db/schema"

export type SettingsSelect = typeof settings.$inferSelect

export async function getSettings(): Promise<SettingsSelect | null> {
  const [row] = await db.select().from(settings).limit(1)
  return row ?? null
}
