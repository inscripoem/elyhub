import Link from "next/link"
import { db } from "@/lib/db"
import { groups, settings } from "@/db/schema"
import { getEffectiveStatus } from "@/lib/status"
import { StatusBadge } from "@/components/public/status-badge"
import { PlatformIcon } from "@/components/public/platform-icon"
import { QrCodePopover } from "@/components/public/qr-code-popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconExternalLink } from "@tabler/icons-react"
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

  const [allGroups, siteSettings] = await Promise.all([
    db.select().from(groups).orderBy(groups.createdAt),
    db.select().from(settings).limit(1),
  ])

  const site = siteSettings[0]
  const now = new Date()

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8">
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-16">平台</TableHead>
              <TableHead className="w-12">头像</TableHead>
              <TableHead>别名</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-32">群号</TableHead>
              <TableHead className="w-32">加入</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  暂无群聊
                </TableCell>
              </TableRow>
            ) : (
              allGroups.map((group) => {
                const effectiveStatus = getEffectiveStatus(group, now)
                return (
                  <TableRow key={group.id} className="hover:bg-muted/30">
                    <TableCell>
                      <StatusBadge status={effectiveStatus} />
                    </TableCell>
                    <TableCell>
                      <PlatformIcon platform={group.platform} showLabel />
                    </TableCell>
                    <TableCell>
                      {group.avatarUrl ? (
                        <img
                          src={group.avatarUrl}
                          alt={group.alias}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          {group.alias[0]?.toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{group.alias}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {group.qqNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {group.joinLink ? (
                        <div className="flex items-center gap-2">
                          <Link
                            href={group.joinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            加群链接
                            <IconExternalLink size={12} />
                          </Link>
                          <QrCodePopover url={group.joinLink} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/admin" className="hover:underline">
          管理后台
        </Link>
      </footer>
    </div>
  )
}
