"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createGroup, updateGroup } from "@/lib/actions/groups"
import type { Group, Settings } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconLock } from "@tabler/icons-react"

type Platform = "qq" | "wechat" | "other"

interface GroupFormProps {
  group?: Group
  settings: Pick<Settings, "qqWorkerEnabled" | "wechatWorkerEnabled">
  workerCapabilities: Record<string, string[]>
}

function isFieldWorkerManaged(
  useWorker: boolean | null,
  platform: Platform,
  field: string,
  settings: GroupFormProps["settings"],
  capabilities: Record<string, string[]>
): boolean {
  const globalEnabled =
    platform === "qq"
      ? settings.qqWorkerEnabled
      : platform === "wechat"
        ? settings.wechatWorkerEnabled
        : false

  const workerOn =
    useWorker === true ? true : useWorker === false ? false : globalEnabled

  if (!workerOn) return false
  return capabilities[platform]?.includes(field) ?? false
}

export function GroupForm({
  group,
  settings,
  workerCapabilities,
}: GroupFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [platform, setPlatform] = useState<Platform>(
    (group?.platform as Platform) ?? "qq"
  )
  const [useWorker, setUseWorker] = useState<boolean | null>(
    group?.useWorker ?? null
  )

  const globalEnabled =
    platform === "qq"
      ? settings.qqWorkerEnabled
      : platform === "wechat"
        ? settings.wechatWorkerEnabled
        : false

  const effectiveWorker =
    useWorker === null ? globalEnabled : useWorker

  function workerLocked(field: string) {
    return isFieldWorkerManaged(
      useWorker,
      platform,
      field,
      settings,
      workerCapabilities
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set(
      "useWorker",
      useWorker === null ? "null" : String(useWorker)
    )
    formData.set("platform", platform)

    startTransition(async () => {
      const result = group
        ? await updateGroup(group.id, formData)
        : await createGroup(formData)

      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Platform */}
      <div className="space-y-2">
        <Label>平台</Label>
        <Select
          value={platform}
          onValueChange={(v) => setPlatform(v as Platform)}
          name="platform"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qq">QQ</SelectItem>
            <SelectItem value="wechat">微信</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alias - always editable */}
      <div className="space-y-2">
        <Label htmlFor="alias">
          群聊别名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="alias"
          name="alias"
          defaultValue={group?.alias}
          placeholder="显示名称"
          required
        />
      </div>

      {/* QQ Number - QQ only */}
      {platform === "qq" && (
        <div className="space-y-2">
          <Label htmlFor="qqNumber">
            群号 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="qqNumber"
            name="qqNumber"
            defaultValue={group?.qqNumber ?? ""}
            placeholder="例：123456789"
            required
          />
        </div>
      )}

      {/* Join Link */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="joinLink">加群链接</Label>
          {workerLocked("join_link") && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLock size={12} /> Worker 管理
            </span>
          )}
        </div>
        <Input
          id="joinLink"
          name="joinLink"
          defaultValue={group?.joinLink ?? ""}
          placeholder="https://..."
          readOnly={workerLocked("join_link")}
          className={workerLocked("join_link") ? "opacity-50 cursor-not-allowed" : ""}
        />
      </div>

      {/* Expire At - wechat only */}
      {platform === "wechat" && (
        <div className="space-y-2">
          <Label htmlFor="expireAt">二维码到期时间</Label>
          <Input
            id="expireAt"
            name="expireAt"
            type="datetime-local"
            defaultValue={
              group?.expireAt
                ? new Date(group.expireAt).toISOString().slice(0, 16)
                : ""
            }
          />
          <p className="text-xs text-muted-foreground">
            设置二维码的物理到期时间，超时后状态自动显示为「失效」
          </p>
        </div>
      )}

      {/* Admin QQ - QQ only */}
      {platform === "qq" && (
        <div className="space-y-2">
          <Label htmlFor="adminQq">管理员 QQ</Label>
          <Input
            id="adminQq"
            name="adminQq"
            defaultValue={group?.adminQq ?? ""}
            placeholder="管理员 QQ 号"
          />
        </div>
      )}

      {/* Use Worker - QQ or Wechat only */}
      {(platform === "qq" || platform === "wechat") && globalEnabled && (
        <div className="space-y-2">
          <Label>Worker 同步</Label>
          <div className="flex items-center gap-3">
            <Switch
              checked={effectiveWorker}
              onCheckedChange={(checked) => setUseWorker(checked)}
            />
            <span className="text-sm text-muted-foreground">
              {useWorker === null
                ? `跟随全局设置（当前：${globalEnabled ? "开启" : "关闭"}）`
                : effectiveWorker
                  ? "已开启 Worker 同步"
                  : "已关闭 Worker 同步"}
            </span>
            {useWorker !== null && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setUseWorker(null)}
              >
                恢复默认
              </button>
            )}
          </div>
          {effectiveWorker && (
            <p className="text-xs text-muted-foreground">
              开启后，Worker 将自动同步名称、头像等字段
            </p>
          )}
        </div>
      )}

      {/* Worker-managed readonly fields info */}
      {(workerLocked("name") || workerLocked("avatar_url")) && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
          <span className="font-medium">Worker 管理字段：</span>
          {[
            workerLocked("name") && "名称",
            workerLocked("avatar_url") && "头像",
            workerLocked("join_link") && "加群链接",
          ]
            .filter(Boolean)
            .join("、")}
          由 Worker 自动更新，不可手动编辑
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : group ? "保存修改" : "创建群聊"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
