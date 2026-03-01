import type { Group } from "@/db/schema"

export type EffectiveStatus = "ACTIVE" | "INVALID" | "UNKNOWN"

export function getEffectiveStatus(
  group: Pick<Group, "status" | "platform" | "expireAt">,
  now = new Date()
): EffectiveStatus {
  if (!group.expireAt || now <= group.expireAt) {
    return group.status
  }
  return group.platform === "qq" ? "UNKNOWN" : "INVALID"
}

export function isWorkerManaged(
  group: Pick<Group, "useWorker" | "platform">,
  settings: { qqWorkerEnabled: boolean; wechatWorkerEnabled: boolean }
): boolean {
  const globalEnabled =
    group.platform === "qq"
      ? settings.qqWorkerEnabled
      : group.platform === "wechat"
        ? settings.wechatWorkerEnabled
        : false

  if (group.useWorker === true) return true
  if (group.useWorker === false) return false
  // null = inherit
  return globalEnabled
}
