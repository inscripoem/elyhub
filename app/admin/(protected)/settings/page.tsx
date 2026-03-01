import { db } from "@/lib/db"
import { settings } from "@/db/schema"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const [row] = await db.select().from(settings).limit(1)
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">站点设置</h1>
      <SettingsForm settings={row} />
    </div>
  )
}
