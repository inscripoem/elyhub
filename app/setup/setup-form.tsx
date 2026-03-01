"use client"

import { useTransition, useState } from "react"
import { runSetup } from "@/lib/actions/setup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SetupForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await runSetup(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建管理员账户</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteTitle">网站名称</Label>
            <Input
              id="siteTitle"
              name="siteTitle"
              placeholder="ElyHub"
              defaultValue="ElyHub"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">管理员名称</Label>
            <Input
              id="adminName"
              name="adminName"
              placeholder="Admin"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">管理员邮箱</Label>
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">密码</Label>
            <Input
              id="adminPassword"
              name="adminPassword"
              type="password"
              placeholder="至少 8 位"
              minLength={8}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "初始化中..." : "完成初始化"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
