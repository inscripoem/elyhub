import { db } from "@/lib/db"
import { groupCategories, settings, workerRegistrations } from "@/db/schema"
import { asc } from "drizzle-orm"
import { GroupsPageClient } from "@/components/admin/groups-page-client"

export default async function AdminGroupsPage() {
  const [allCategories, siteSettings, registrations] = await Promise.all([
    db.select().from(groupCategories).orderBy(asc(groupCategories.sortOrder)),
    db.select().from(settings).limit(1),
    db.select().from(workerRegistrations),
  ])

  const s = siteSettings[0] ?? {
    qqWorkerEnabled: false,
    wechatWorkerEnabled: false,
  }

  const workerRegsMap = Object.fromEntries(
    registrations.map((r) => [r.platform, r])
  )

  return (
    <GroupsPageClient
      categories={allCategories}
      settings={s}
      workerRegistrations={workerRegsMap}
    />
  )
}
