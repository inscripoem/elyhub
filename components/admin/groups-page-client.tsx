"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Group, Settings, WorkerRegistration } from "@/db/schema"
import { getEffectiveStatus } from "@/lib/status"
import { StatusBadge } from "@/components/public/status-badge"
import { PlatformIcon } from "@/components/public/platform-icon"
import { DeleteGroupButton } from "@/components/admin/delete-group-button"
import { GroupForm } from "@/components/admin/group-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconPlus, IconPencil } from "@tabler/icons-react"

interface GroupsPageClientProps {
  groups: Group[]
  settings: Pick<Settings, "qqWorkerEnabled" | "wechatWorkerEnabled">
  workerRegistrations: Record<string, WorkerRegistration>
}

export function GroupsPageClient({
  groups,
  settings,
  workerRegistrations,
}: GroupsPageClientProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  function openAdd() {
    setEditingGroup(null)
    setSheetOpen(true)
  }

  function openEdit(group: Group) {
    setEditingGroup(group)
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    router.refresh()
  }

  const nowDate = new Date()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">群聊管理</h1>
        <Button size="sm" onClick={openAdd}>
          <IconPlus size={16} />
          添加群聊
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
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  暂无群聊，
                  <button
                    onClick={openAdd}
                    className="text-primary underline"
                  >
                    立即添加
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => {
                const effectiveStatus = getEffectiveStatus(group, nowDate)
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(group)}
                        >
                          <IconPencil size={16} />
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingGroup ? "编辑群聊" : "添加群聊"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <GroupForm
              group={editingGroup ?? undefined}
              settings={settings}
              workerRegistrations={workerRegistrations}
              onSuccess={handleSuccess}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
