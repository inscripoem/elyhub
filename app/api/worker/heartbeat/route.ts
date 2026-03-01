import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { workerRegistrations } from "@/db/schema"
import { requireWorkerAuth } from "@/lib/worker-auth"
import { z } from "zod"

const heartbeatSchema = z.object({
  capabilities: z.array(z.string()).default([]),
  expectedIntervalSeconds: z.number().int().positive().default(60),
})

export async function POST(req: NextRequest) {
  const auth = requireWorkerAuth(req)
  if (!auth.ok) return auth.response

  const body = await req.json()
  const parsed = heartbeatSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { capabilities, expectedIntervalSeconds } = parsed.data

  await db
    .insert(workerRegistrations)
    .values({
      platform: auth.platform,
      capabilities,
      expectedIntervalSeconds,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workerRegistrations.platform,
      set: {
        capabilities,
        expectedIntervalSeconds,
        lastSeenAt: new Date(),
      },
    })

  return Response.json({ ok: true })
}
