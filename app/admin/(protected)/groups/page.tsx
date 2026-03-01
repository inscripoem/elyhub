import { db } from "@/lib/db"
import { groups, groupCategories, settings, workerRegistrations } from "@/db/schema"
import { asc, desc } from "drizzle-orm"
import { GroupsPageClient } from "@/components/admin/groups-page-client"

export default async function AdminGroupsPage() {
  const [allGroups, allCategories, siteSettings, registrations] = await Promise.all([
    db.select().from(groups).orderBy(desc(groups.createdAt)),
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
      groups={allGroups}
      categories={allCategories}
      settings={s}
      workerRegistrations={workerRegsMap}
    />
  )
}
