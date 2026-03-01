import { Badge } from "@/components/ui/badge"
import type { EffectiveStatus } from "@/lib/status"

const STATUS_CONFIG: Record<
  EffectiveStatus,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline" ; className: string }
> = {
  ACTIVE: {
    label: "正常",
    variant: "default",
    className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/15",
  },
  INVALID: {
    label: "失效",
    variant: "destructive",
    className: "",
  },
  UNKNOWN: {
    label: "未知",
    variant: "secondary",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15",
  },
}

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
