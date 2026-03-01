import { db } from "@/lib/db"
import { workerRegistrations, groups } from "@/db/schema"
import { eq } from "drizzle-orm"
import { WorkerStatusCard } from "./worker-status-card"

const PLATFORMS = ["qq", "wechat"] as const

export default async function DashboardPage() {
  const [registrations, groupCounts] = await Promise.all([
    db.select().from(workerRegistrations),
    Promise.all(
      PLATFORMS.map(async (p) => {
        const count = await db
          .select()
          .from(groups)
          .where(eq(groups.platform, p))
        return { platform: p, count: count.length }
      })
    ),
  ])

  const countMap = Object.fromEntries(
    groupCounts.map(({ platform, count }) => [platform, count])
  )
  const now = new Date()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Worker 状态</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const reg = registrations.find((r) => r.platform === platform)
          const isOnline =
            reg != null &&
            new Date(reg.lastSeenAt).getTime() +
              (reg.expectedIntervalSeconds + 300) * 1000 >
              now.getTime()

          return (
            <WorkerStatusCard
              key={platform}
              platform={platform}
              isOnline={isOnline}
              lastSeenAt={reg?.lastSeenAt ?? null}
              capabilities={(reg?.capabilities as string[]) ?? []}
              groupCount={countMap[platform] ?? 0}
            />
          )
        })}
      </div>
    </div>
  )
}
