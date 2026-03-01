export const dynamic = "force-dynamic"

import { checkInitialized } from "@/lib/actions/setup"
import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const initialized = await checkInitialized()
  if (!initialized) redirect("/setup")

  const session = await getSession()
  if (session?.user?.role === "admin") redirect("/admin")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-muted-foreground mt-2">请登录以继续</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
