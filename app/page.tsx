import Link from "next/link"
import { db } from "@/lib/db"
import { groups, groupCategories, settings } from "@/db/schema"
import { asc } from "drizzle-orm"
import { HomePageClient } from "@/components/public/home-page-client"
import type { Metadata } from "next"
import { checkInitialized } from "@/lib/actions/setup"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const [row] = await db.select().from(settings).limit(1)
  return { title: row?.siteTitle ?? "ElyHub" }
}

export default async function HomePage() {
  const initialized = await checkInitialized()
  if (!initialized) redirect("/setup")

  const [allGroups, allCategories, siteSettings] = await Promise.all([
    db.select().from(groups).orderBy(groups.createdAt),
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
          共 {allGroups.length} 个群聊
        </p>
      </header>

      <HomePageClient
        groups={allGroups}
        categories={allCategories}
        announcement={site?.siteAnnouncement}
      />

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/admin" className="hover:underline">
          管理后台
        </Link>
      </footer>
    </div>
  )
}
