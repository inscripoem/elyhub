import { IconBrandWechat, IconMessage, IconWorld } from "@tabler/icons-react"

const PLATFORM_CONFIG = {
  qq: { label: "QQ", Icon: IconMessage },
  wechat: { label: "微信", Icon: IconBrandWechat },
  other: { label: "其他", Icon: IconWorld },
} as const

type Platform = keyof typeof PLATFORM_CONFIG

export function PlatformIcon({
  platform,
  showLabel = false,
}: {
  platform: Platform
  showLabel?: boolean
}) {
  const { label, Icon } = PLATFORM_CONFIG[platform]
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon size={16} aria-label={label} />
      {showLabel && <span className="text-xs">{label}</span>}
    </span>
  )
}
