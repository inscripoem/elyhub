"use server"

import { db } from "@/lib/db"
import { settings } from "@/db/schema"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { z } from "zod"

const setupSchema = z.object({
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  siteTitle: z.string().min(1).default("ElyHub"),
})

export async function runSetup(formData: FormData) {
  const parsed = setupSchema.safeParse({
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
    siteTitle: formData.get("siteTitle") || "ElyHub",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { adminName, adminEmail, adminPassword, siteTitle } = parsed.data

  // Check not already initialized
  const [existing] = await db.select().from(settings).limit(1)
  if (existing) {
    return { error: "Already initialized" }
  }

  // Insert settings
  await db.insert(settings).values({ siteTitle })

  // Create admin user via better-auth
  const result = await auth.api.signUpEmail({
    body: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
    },
  })

  if (result.user) {
    // Promote to admin role
    const { headers } = await import("next/headers")
    await auth.api.setRole({
      body: { userId: result.user.id, role: "admin" },
      headers: await headers(),
    })
  }

  redirect("/admin")
}

export async function checkInitialized() {
  try {
    const [row] = await db.select().from(settings).limit(1)
    return !!row
  } catch {
    return false
  }
}
