import { db } from "@/lib/db"
import { groupCategories, settings, workerRegistrations } from "@/db/schema"
import { asc } from "drizzle-orm"
import { GroupForm } from "@/components/admin/group-form"

export default async function NewGroupPage() {
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
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">添加群聊</h1>
      <GroupForm categories={allCategories} settings={s} workerRegistrations={workerRegsMap} />
    </div>
  )
}
