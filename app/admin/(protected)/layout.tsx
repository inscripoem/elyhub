export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkInitialized } from "@/lib/actions/setup"
import { getSession } from "@/lib/auth-server"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check initialization first
  const initialized = await checkInitialized()
  if (!initialized) redirect("/setup")

  // Check auth (belt & suspenders alongside middleware)
  const session = await getSession()
  if (!session || session.user.role !== "admin") {
    redirect("/admin/login")
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
