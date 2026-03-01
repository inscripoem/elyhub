import { NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "@/db/schema"

// Edge-safe proxy: only check session cookie, no DB access
// DB-based initialization check is done in admin/(protected)/layout.tsx (RSC)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect admin routes (not login page)
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login")
  ) {
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: req.nextUrl.origin,
        headers: { cookie: req.headers.get("cookie") ?? "" },
      }
    )

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
