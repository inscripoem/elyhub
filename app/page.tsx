import Link from "next/link"
import { db } from "@/lib/db"
import { groupCategories, settings } from "@/db/schema"
import { asc } from "drizzle-orm"
import { searchGroups } from "@/lib/repositories/groups-search"
import { HomePageClient } from "@/components/public/home-page-client"
import type { Metadata } from "next"
import { checkInitialized } from "@/lib/actions/setup"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const [row] = await db.select().from(settings).limit(1)
  return { title: row?.siteTitle ?? "ElyHub" }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const initialized = await checkInitialized()
  if (!initialized) redirect("/setup")

  const params = await searchParams

  const search = typeof params.search === "string" ? params.search : undefined
  const platform =
    params.platform === "qq" || params.platform === "wechat" || params.platform === "other"
      ? params.platform
      : undefined
  const status =
    params.status === "ACTIVE" || params.status === "INVALID" || params.status === "UNKNOWN"
      ? params.status
      : undefined

  const [filteredResult, allCategories, siteSettings] = await Promise.all([
    searchGroups({ search, platform, status }),
    db.select().from(groupCategories).orderBy(asc(groupCategories.sortOrder)),
    db.select().from(settings).limit(1),
  ])

  const site = siteSettings[0]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {site?.siteAvatarUrl && (
            <img
              src={site.siteAvatarUrl}
              alt="Site avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">{site?.siteTitle ?? "ElyHub"}</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          共 {filteredResult.total} 个群聊
        </p>
      </header>

      <HomePageClient
        groups={filteredResult.items}
        categories={allCategories}
        announcement={site?.siteAnnouncement}
        initialSearch={search ?? ""}
        initialPlatform={platform ?? "all"}
        initialStatus={status ?? "all"}
      />

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/admin" className="hover:underline">
          管理后台
        </Link>
      </footer>
    </div>
  )
}
