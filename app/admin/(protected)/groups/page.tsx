import { db } from "@/lib/db"
import { groups, settings, workerRegistrations } from "@/db/schema"
import { GroupsPageClient } from "@/components/admin/groups-page-client"

export default async function AdminGroupsPage() {
  const [allGroups, siteSettings, registrations] = await Promise.all([
    db.select().from(groups).orderBy(groups.createdAt),
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
      settings={s}
      workerRegistrations={workerRegsMap}
    />
  )
}
