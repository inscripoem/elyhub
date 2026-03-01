"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
  IconUsers,
  IconSettings,
  IconLayoutDashboard,
  IconLogout,
  IconWorld,
  IconFolder,
} from "@tabler/icons-react"
type AuthUser = {
  id: string
  name: string
  email: string
  role?: string | null
}

const navItems = [
  { href: "/admin/dashboard", label: "Worker 状态", icon: IconLayoutDashboard, exact: false },
  { href: "/admin/groups", label: "群聊管理", icon: IconUsers, exact: true },
  { href: "/admin/groups/categories", label: "分组管理", icon: IconFolder, exact: false },
  { href: "/admin/settings", label: "设置", icon: IconSettings, exact: false },
]

export function AdminSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/admin/login")
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href || pathname.startsWith(href + "/new") || (pathname.startsWith(href + "/") && !pathname.startsWith(href + "/categories"))
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 border-r bg-sidebar flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <IconWorld size={18} />
          <span>ElyHub</span>
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(href, exact)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground mb-2 truncate">
          {user.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <IconLogout size={16} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
