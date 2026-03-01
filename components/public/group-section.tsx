import Link from "next/link"
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
import type { Group } from "@/db/schema"

interface GroupSectionProps {
  title: string
  groups: Group[]
  now: Date
}

export function GroupSection({ title, groups, now }: GroupSectionProps) {
  if (groups.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {title}
        <span className="ml-2 text-xs font-normal normal-case">({groups.length})</span>
      </h2>
      <div className="border rounded-lg overflow-hidden mb-6">
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
            {groups.map((group) => {
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
