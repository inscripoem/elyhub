import { db } from "@/lib/db"
import { workerRegistrations } from "@/db/schema"

export async function upsertWorkerRegistration(data: {
  platform: "qq" | "wechat"
  capabilities: string[]
  expectedIntervalSeconds: number
}) {
  await db
    .insert(workerRegistrations)
    .values({ ...data, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: workerRegistrations.platform,
      set: {
        capabilities: data.capabilities,
        expectedIntervalSeconds: data.expectedIntervalSeconds,
        lastSeenAt: new Date(),
      },
    })
}
