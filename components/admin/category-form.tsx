"use client"

import { useState, useTransition } from "react"
import { createCategory, updateCategory } from "@/lib/actions/group-categories"
import type { GroupCategory } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CategoryFormProps {
  category?: GroupCategory
  onSuccess?: () => void
  onCancel?: () => void
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, formData)
        : await createCategory(formData)

      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">分组名称 *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name ?? ""}
          required
          placeholder="例如：学习交流"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={category?.description ?? ""}
          placeholder="可选，简短描述该分组"
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "保存中..." : "保存"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  )
}
