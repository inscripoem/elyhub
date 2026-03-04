"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDownload, IconChevronDown } from "@tabler/icons-react"

interface GroupsExportFilters {
  search: string
  platformFilter: string
  categoryFilter: string
  statusFilter: string
}

interface GroupsExportButtonProps {
  filters: GroupsExportFilters
}

export function GroupsExportButton({ filters }: GroupsExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport(mode: "filtered" | "all") {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ mode })
      if (mode === "filtered") {
        if (filters.platformFilter !== "all") params.set("platform", filters.platformFilter)
        if (filters.categoryFilter !== "all") params.set("categoryId", filters.categoryFilter)
        if (filters.search.trim()) params.set("search", filters.search.trim())
        if (filters.statusFilter !== "all") params.set("status", filters.statusFilter)
      }

      const res = await fetch(`/api/admin/groups/export?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? "导出失败")
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? "groups-export.xlsx"

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <IconDownload size={16} />
          {isExporting ? "导出中..." : "导出"}
          <IconChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("filtered")}>
          导出当前筛选
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("all")}>
          导出全部数据
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
