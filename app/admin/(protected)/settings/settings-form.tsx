"use client"

import { useState, useTransition } from "react"
import { updateSettings } from "@/lib/actions/settings"
import type { Settings } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function SettingsForm({ settings }: { settings: Settings | undefined }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [qqEnabled, setQqEnabled] = useState(settings?.qqWorkerEnabled ?? false)
  const [wechatEnabled, setWechatEnabled] = useState(
    settings?.wechatWorkerEnabled ?? false
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    formData.set("qqWorkerEnabled", String(qqEnabled))
    formData.set("wechatWorkerEnabled", String(wechatEnabled))

    startTransition(async () => {
      const result = await updateSettings(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteTitle">网站名称</Label>
            <Input
              id="siteTitle"
              name="siteTitle"
              defaultValue={settings?.siteTitle ?? "ElyHub"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteAvatarUrl">网站头像 URL</Label>
            <Input
              id="siteAvatarUrl"
              name="siteAvatarUrl"
              defaultValue={settings?.siteAvatarUrl ?? ""}
              placeholder="https://example.com/avatar.png"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteAnnouncement">网站公告</Label>
            <Textarea
              id="siteAnnouncement"
              name="siteAnnouncement"
              defaultValue={settings?.siteAnnouncement ?? ""}
              placeholder="留空则不显示公告"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              公告将显示在主页标题下方，支持换行
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worker 全局开关</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">QQ Worker</p>
              <p className="text-xs text-muted-foreground">
                开启后允许 QQ Worker 同步群聊信息
              </p>
            </div>
            <Switch checked={qqEnabled} onCheckedChange={setQqEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">微信 Worker</p>
              <p className="text-xs text-muted-foreground">
                开启后允许微信 Worker 同步群聊信息
              </p>
            </div>
            <Switch
              checked={wechatEnabled}
              onCheckedChange={setWechatEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">设置已保存</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存设置"}
      </Button>
    </form>
  )
}
