import type { WorkerRegistration } from "@/db/schema"

export function isWorkerOnline(reg?: WorkerRegistration | null): boolean {
  if (!reg) return false
  const lastSeen = new Date(reg.lastSeenAt).getTime()
  const threshold = (reg.expectedIntervalSeconds + 300) * 1000
  return lastSeen + threshold > Date.now()
}
