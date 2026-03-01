"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteCategory, reorderCategories } from "@/lib/actions/group-categories"
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
import { IconPencil, IconTrash, IconGripVertical, IconPlus } from "@tabler/icons-react"
import type { GroupCategory } from "@/db/schema"

interface CategoryListClientProps {
  categories: GroupCategory[]
}

interface SortableRowProps {
  cat: GroupCategory
  onEdit: (cat: GroupCategory) => void
  onDelete: (id: string) => void
  isPending: boolean
}

function SortableRow({ cat, onEdit, onDelete, isPending }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          aria-label="拖拽排序"
        >
          <IconGripVertical size={16} />
        </button>
      </TableCell>
      <TableCell className="font-medium">{cat.name}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {cat.description ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(cat)}>
            <IconPencil size={16} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isPending}>
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
                  onClick={() => onDelete(cat.id)}
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
  )
}

export function CategoryListClient({ categories }: CategoryListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<GroupCategory | null>(null)
  const [items, setItems] = useState(
    [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const sensors = useSensors(useSensor(PointerSensor))

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((c) => c.id === active.id)
    const newIndex = items.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    setItems(reordered)
    startTransition(async () => {
      await reorderCategories(reordered.map((c) => c.id))
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

      {items.length === 0 ? (
        <div className="border rounded-lg py-12 text-center text-muted-foreground text-sm">
          暂无分组，
          <button onClick={openAdd} className="text-primary underline">
            立即添加
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10" />
                  <TableHead>分组名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={items.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((cat) => (
                    <SortableRow
                      key={cat.id}
                      cat={cat}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      isPending={isPending}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </div>
        </DndContext>
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
