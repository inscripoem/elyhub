import Link from "next/link"
import { db } from "@/lib/db"
import { groups } from "@/db/schema"
import { getEffectiveStatus } from "@/lib/status"
import { StatusBadge } from "@/components/public/status-badge"
import { PlatformIcon } from "@/components/public/platform-icon"
import { DeleteGroupButton } from "@/components/admin/delete-group-button"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconPlus, IconPencil } from "@tabler/icons-react"

export default async function AdminGroupsPage() {
  const allGroups = await db.select().from(groups).orderBy(groups.createdAt)
  const now = new Date()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">群聊管理</h1>
        <Button asChild size="sm">
          <Link href="/admin/groups/new">
            <IconPlus size={16} />
            添加群聊
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-16">平台</TableHead>
              <TableHead>别名</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-32">群号</TableHead>
              <TableHead className="w-20">Worker</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  暂无群聊，
                  <Link
                    href="/admin/groups/new"
                    className="text-primary underline"
                  >
                    立即添加
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              allGroups.map((group) => {
                const effectiveStatus = getEffectiveStatus(group, now)
                return (
                  <TableRow key={group.id}>
                    <TableCell>
                      <StatusBadge status={effectiveStatus} />
                    </TableCell>
                    <TableCell>
                      <PlatformIcon platform={group.platform} showLabel />
                    </TableCell>
                    <TableCell className="font-medium">{group.alias}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {group.qqNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs ${group.useWorker === true ? "text-green-600" : group.useWorker === false ? "text-muted-foreground" : "text-blue-500"}`}
                      >
                        {group.useWorker === true
                          ? "开启"
                          : group.useWorker === false
                            ? "关闭"
                            : "默认"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/groups/${group.id}/edit`}>
                            <IconPencil size={16} />
                          </Link>
                        </Button>
                        <DeleteGroupButton id={group.id} alias={group.alias} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
