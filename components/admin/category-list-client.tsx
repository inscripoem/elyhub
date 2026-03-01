"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteCategory, reorderCategory } from "@/lib/actions/group-categories"
import { CategoryForm } from "@/components/admin/category-form"
import { Button } from "@/components/ui/button"
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
import { IconPencil, IconTrash, IconChevronUp, IconChevronDown, IconPlus } from "@tabler/icons-react"
import type { GroupCategory } from "@/db/schema"

interface CategoryListClientProps {
  categories: GroupCategory[]
}

export function CategoryListClient({ categories }: CategoryListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<GroupCategory | null>(null)

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  function openAdd() {
    setEditingCategory(null)
    setSheetOpen(true)
  }

  function openEdit(category: GroupCategory) {
    setEditingCategory(category)
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    router.refresh()
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderCategory(id, direction)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCategory(id)
      router.refresh()
    })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">分组管理</h1>
        <Button size="sm" onClick={openAdd}>
          <IconPlus size={16} />
          添加分组
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="border rounded-lg py-12 text-center text-muted-foreground text-sm">
          暂无分组，
          <button onClick={openAdd} className="text-primary underline">
            立即添加
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">顺序</TableHead>
                <TableHead>分组名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((cat, idx) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0 || isPending}
                        onClick={() => handleReorder(cat.id, "up")}
                      >
                        <IconChevronUp size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === sorted.length - 1 || isPending}
                        onClick={() => handleReorder(cat.id, "down")}
                      >
                        <IconChevronDown size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cat.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                      >
                        <IconPencil size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <IconTrash size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>删除分组</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除分组「{cat.name}」吗？该分组下的群聊不会被删除，仅取消分组关联。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(cat.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingCategory ? "编辑分组" : "添加分组"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CategoryForm
              category={editingCategory ?? undefined}
              onSuccess={handleSuccess}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
