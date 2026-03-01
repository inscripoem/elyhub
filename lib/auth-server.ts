import { auth } from "./auth"
import { headers } from "next/headers"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "admin") {
    return null
  }
  return session
}
