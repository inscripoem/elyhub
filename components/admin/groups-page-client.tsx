"use client"

import { useState, useMemo, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Group, GroupCategory, Settings, WorkerRegistration } from "@/db/schema"
import { getEffectiveStatus } from "@/lib/status"
import { StatusBadge } from "@/components/public/status-badge"
import { PlatformIcon } from "@/components/public/platform-icon"
import { DeleteGroupButton } from "@/components/admin/delete-group-button"
import { GroupForm } from "@/components/admin/group-form"
import { SimplePagination } from "@/components/ui/simple-pagination"
import { deleteGroups } from "@/lib/actions/groups"
import { GroupsExportButton } from "@/components/admin/groups-export-button"
import { GroupsImportDialog } from "@/components/admin/groups-import-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconPlus,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react"

const PAGE_SIZE = 20

/** API 返回的序列化群聊对象（日期为 ISO 字符串） */
interface ApiGroup {
  id: string
  categoryId: string | null
  platform: Group["platform"]
  alias: string
  name: string | null
  qqNumber: string | null
  joinLink: string | null
  adminQq: string | null
  status: Group["status"]
  expireAt: string | null
  avatarUrl: string | null
  useWorker: boolean | null
  createdAt: string
  updatedAt: string
  lastSyncedAt: string | null
}

interface ApiMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function parseApiGroup(raw: ApiGroup): Group {
  return {
    ...raw,
    expireAt: raw.expireAt ? new Date(raw.expireAt) : null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    lastSyncedAt: raw.lastSyncedAt ? new Date(raw.lastSyncedAt) : null,
  }
}

interface GroupsPageClientProps {
  categories: GroupCategory[]
  settings: Pick<Settings, "qqWorkerEnabled" | "wechatWorkerEnabled">
  workerRegistrations: Record<string, WorkerRegistration>
}

export function GroupsPageClient({
  categories,
  settings,
  workerRegistrations,
}: GroupsPageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  // Filter state
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Data state (fetched from API)
  const [groups, setGroups] = useState<Group[]>([])
  const [meta, setMeta] = useState<ApiMeta>({
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const nowDate = useMemo(() => new Date(), [])

  // Fetch data from backend API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("pageSize", String(PAGE_SIZE))
      if (search.trim()) params.set("search", search.trim())
      if (platformFilter !== "all") params.set("platform", platformFilter)
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/groups?${params.toString()}`)
      if (!res.ok) {
        console.error("Failed to fetch groups:", await res.text())
        return
      }

      const json = await res.json()
      setGroups((json.data as ApiGroup[]).map(parseApiGroup))
      setMeta(json.meta as ApiMeta)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, search, platformFilter, statusFilter, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [search, platformFilter, statusFilter, categoryFilter])

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
    fetchData()
  }

  const allPageSelected = groups.length > 0 && groups.every((g) => selectedIds.has(g.id))
  const somePageSelected = groups.some((g) => selectedIds.has(g.id))

  function toggleSelectAll() {
    if (allPageSelected) {
      const next = new Set(selectedIds)
      groups.forEach((g) => next.delete(g.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      groups.forEach((g) => next.add(g.id))
      setSelectedIds(next)
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      await deleteGroups(ids)
      setSelectedIds(new Set())
      fetchData()
    })
  }

  function handlePageChange(page: number) {
    setCurrentPage(page)
    setSelectedIds(new Set())
  }

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">群聊管理</h1>
        <div className="flex items-center gap-2">
          <GroupsExportButton
            filters={{ search, platformFilter, categoryFilter, statusFilter }}
          />
          <GroupsImportDialog onSuccess={() => router.refresh()} />
          <Button size="sm" onClick={openAdd}>
            <IconPlus size={16} />
            添加群聊
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-48">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="搜索别名或名称..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        {categories.length > 0 && (
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="分组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分组</SelectItem>
              <SelectItem value="none">未分组</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={platformFilter}
          onValueChange={setPlatformFilter}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="qq">QQ</SelectItem>
            <SelectItem value="wechat">微信</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="ACTIVE">活跃</SelectItem>
            <SelectItem value="INVALID">已失效</SelectItem>
            <SelectItem value="UNKNOWN">未知</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-muted/50 rounded-md border">
          <span className="text-sm text-muted-foreground">已选 {selectedIds.size} 项</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <IconTrash size={14} />
                删除选中
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>批量删除群聊</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除选中的 {selectedIds.size} 个群聊吗？此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSelected}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            className="text-xs text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            取消选择
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="全选当前页"
                />
              </TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-16">平台</TableHead>
              <TableHead>别名</TableHead>
              <TableHead>名称</TableHead>
              {categories.length > 0 && <TableHead className="w-28">分组</TableHead>}
              <TableHead className="w-32">群号</TableHead>
              <TableHead className="w-20">Worker</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={categories.length > 0 ? 9 : 8}
                  className="text-center text-muted-foreground py-12"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={categories.length > 0 ? 9 : 8}
                  className="text-center text-muted-foreground py-12"
                >
                  {meta.total === 0 ? (
                    <>
                      暂无群聊，
                      <button onClick={openAdd} className="text-primary underline">
                        立即添加
                      </button>
                    </>
                  ) : (
                    "没有匹配的群聊"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => {
                const effectiveStatus = getEffectiveStatus(group, nowDate)
                return (
                  <TableRow key={group.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(group.id)}
                        onCheckedChange={() => toggleSelect(group.id)}
                        aria-label={`选择 ${group.alias}`}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={effectiveStatus} lastSyncedAt={group.lastSyncedAt} />
                    </TableCell>
                    <TableCell>
                      <PlatformIcon platform={group.platform} showLabel />
                    </TableCell>
                    <TableCell className="font-medium">{group.alias}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.name ?? "—"}
                    </TableCell>
                    {categories.length > 0 && (
                      <TableCell className="text-muted-foreground text-sm">
                        {group.categoryId ? (categoryMap[group.categoryId] ?? "—") : "—"}
                      </TableCell>
                    )}
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

      <SimplePagination
        currentPage={currentPage}
        totalItems={meta.total}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingGroup ? "编辑群聊" : "添加群聊"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <GroupForm
              group={editingGroup ?? undefined}
              categories={categories}
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
