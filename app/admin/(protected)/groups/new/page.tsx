import { db } from "@/lib/db"
import { settings, workerRegistrations } from "@/db/schema"
import { GroupForm } from "@/components/admin/group-form"

export default async function NewGroupPage() {
  const [siteSettings, registrations] = await Promise.all([
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
      <GroupForm settings={s} workerRegistrations={workerRegsMap} />
    </div>
  )
}
