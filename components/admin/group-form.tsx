"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createGroup, updateGroup } from "@/lib/actions/groups"
import { isWorkerOnline } from "@/lib/worker-utils"
import type { Group, GroupCategory, Settings, WorkerRegistration } from "@/db/schema"
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
import { IconLock, IconAlertTriangle } from "@tabler/icons-react"

type Platform = "qq" | "wechat" | "other"

interface GroupFormProps {
  group?: Group
  categories?: GroupCategory[]
  settings: Pick<Settings, "qqWorkerEnabled" | "wechatWorkerEnabled">
  workerRegistrations: Record<string, WorkerRegistration>
  onSuccess?: () => void
  onCancel?: () => void
}

export function GroupForm({
  group,
  categories = [],
  settings,
  workerRegistrations,
  onSuccess,
  onCancel,
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
  const [categoryId, setCategoryId] = useState<string>(
    group?.categoryId ?? "none"
  )

  const globalEnabled =
    platform === "qq"
      ? settings.qqWorkerEnabled
      : platform === "wechat"
        ? settings.wechatWorkerEnabled
        : false

  const effectiveWorker = useWorker === null ? globalEnabled : useWorker

  const workerReg = workerRegistrations[platform] ?? null
  const workerOnline = isWorkerOnline(workerReg)
  const capabilities = (workerReg?.capabilities as string[]) ?? []

  function workerLocked(field: string): boolean {
    return effectiveWorker && workerOnline && capabilities.includes(field)
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
    formData.set("categoryId", categoryId === "none" ? "" : categoryId)

    startTransition(async () => {
      const result = group
        ? await updateGroup(group.id, formData)
        : await createGroup(formData)

      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/admin/groups")
        }
      }
    })
  }

  function handleCancel() {
    if (onCancel) {
      onCancel()
    } else {
      router.push("/admin/groups")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>分组</Label>
          <Select value={categoryId} onValueChange={setCategoryId} name="categoryId">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不分组</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

      {/* Name - QQ only */}
      {platform === "qq" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="name">群名称</Label>
            {workerLocked("name") && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <IconLock size={12} /> Worker 管理
              </span>
            )}
          </div>
          <Input
            id="name"
            name="name"
            defaultValue={group?.name ?? ""}
            placeholder="群的实际名称"
            readOnly={workerLocked("name")}
            className={workerLocked("name") ? "opacity-50 cursor-not-allowed" : ""}
          />
        </div>
      )}

      {/* Avatar URL - all platforms */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="avatarUrl">头像 URL</Label>
          {workerLocked("avatar_url") && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLock size={12} /> Worker 管理
            </span>
          )}
        </div>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          defaultValue={group?.avatarUrl ?? ""}
          placeholder="https://..."
          readOnly={workerLocked("avatar_url")}
          className={workerLocked("avatar_url") ? "opacity-50 cursor-not-allowed" : ""}
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

      {/* Use Worker - QQ or Wechat only, always shown */}
      {(platform === "qq" || platform === "wechat") && (
        <div className="space-y-2">
          <Label>Worker 同步</Label>
          <div className="flex items-center gap-3">
            <Switch
              checked={effectiveWorker}
              onCheckedChange={(checked) => setUseWorker(checked)}
              disabled={!globalEnabled}
            />
            <span className="text-sm text-muted-foreground">
              {!globalEnabled
                ? "全局未启用"
                : useWorker === null
                  ? `跟随全局设置（当前：${globalEnabled ? "开启" : "关闭"}）`
                  : effectiveWorker
                    ? "已开启 Worker 同步"
                    : "已关闭 Worker 同步"}
            </span>
            {useWorker !== null && globalEnabled && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setUseWorker(null)}
              >
                恢复默认
              </button>
            )}
          </div>

          {/* Offline warning */}
          {effectiveWorker && !workerOnline && globalEnabled && (
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md p-2.5">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Worker 当前离线，手动修改的内容在 Worker 重新上线后将被覆盖
              </span>
            </div>
          )}

          {effectiveWorker && workerOnline && (
            <p className="text-xs text-muted-foreground">
              开启后，Worker 将自动同步名称、头像等字段
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : group ? "保存修改" : "创建群聊"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
