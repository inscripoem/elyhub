import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlatformIcon } from "@/components/public/platform-icon"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface WorkerStatusCardProps {
  platform: "qq" | "wechat"
  isOnline: boolean
  lastSeenAt: Date | null
  capabilities: string[]
  groupCount: number
}

const CAPABILITY_LABELS: Record<string, string> = {
  status: "状态",
  name: "名称",
  avatar_url: "头像",
  join_link: "加群链接",
}

export function WorkerStatusCard({
  platform,
  isOnline,
  lastSeenAt,
  capabilities,
  groupCount,
}: WorkerStatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PlatformIcon platform={platform} showLabel />
            Worker
          </CardTitle>
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className={
              isOnline
                ? "bg-green-500/15 text-green-700 border-green-500/20"
                : ""
            }
          >
            {isOnline ? "在线" : "离线"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>最后心跳</span>
          <span>
            {lastSeenAt
              ? formatDistanceToNow(new Date(lastSeenAt), {
                  addSuffix: true,
                  locale: zhCN,
                })
              : "从未"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>管理群聊数</span>
          <span>{groupCount}</span>
        </div>
        {capabilities.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1">支持同步字段</p>
            <div className="flex flex-wrap gap-1">
              {capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-xs">
                  {CAPABILITY_LABELS[cap] ?? cap}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {capabilities.length === 0 && (
          <p className="text-muted-foreground">尚未注册</p>
        )}
      </CardContent>
    </Card>
  )
}
