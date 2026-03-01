import { db } from "@/lib/db"
import { groups, settings, workerRegistrations } from "@/db/schema"
import { GroupForm } from "@/components/admin/group-form"
import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"

type Params = { params: Promise<{ id: string }> }

export default async function EditGroupPage({ params }: Params) {
  const { id } = await params

  const [group, siteSettings, registrations] = await Promise.all([
    db.select().from(groups).where(eq(groups.id, id)).then((r) => r[0]),
    db.select().from(settings).limit(1),
    db.select().from(workerRegistrations),
  ])

  if (!group) notFound()

  const s = siteSettings[0] ?? {
    qqWorkerEnabled: false,
    wechatWorkerEnabled: false,
  }

  const workerRegsMap = Object.fromEntries(
    registrations.map((r) => [r.platform, r])
  )

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">编辑群聊</h1>
      <GroupForm group={group} settings={s} workerRegistrations={workerRegsMap} />
    </div>
  )
}
