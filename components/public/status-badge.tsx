"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { EffectiveStatus } from "@/lib/status"

const STATUS_CONFIG: Record<
  EffectiveStatus,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline"; className: string; dotColor: string }
> = {
  ACTIVE: {
    label: "正常",
    variant: "default",
    className:
      "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/15",
    dotColor: "bg-green-500",
  },
  INVALID: {
    label: "失效",
    variant: "destructive",
    className: "",
    dotColor: "bg-red-500",
  },
  UNKNOWN: {
    label: "未知",
    variant: "secondary",
    className:
      "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/15",
    dotColor: "bg-gray-500",
  },
}

function formatSyncTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function StatusBadge({
  status,
  lastSyncedAt,
}: {
  status: EffectiveStatus
  lastSyncedAt: Date | null
}) {
  const config = STATUS_CONFIG[status]
  const tooltipText = lastSyncedAt
    ? `上次同步：${formatSyncTime(lastSyncedAt)}`
    : "暂无同步记录"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className={config.className}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  )
}
