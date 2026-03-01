export const dynamic = "force-dynamic"

import { checkInitialized } from "@/lib/actions/setup"
import { redirect } from "next/navigation"
import { SetupForm } from "./setup-form"

export default async function SetupPage() {
  const initialized = await checkInitialized()
  if (initialized) redirect("/admin")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">初始化设置</h1>
          <p className="text-muted-foreground mt-2">
            欢迎使用 ElyHub，请完成初始化配置
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  )
}
