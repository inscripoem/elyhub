import type { Group } from "@/db/schema"

export type EffectiveStatus = "ACTIVE" | "INVALID" | "UNKNOWN"

/**
 * 平台过期后的展示状态映射。
 *
 * 当群的 expireAt 过期时，不同平台的展示状态降级规则不同：
 * - QQ: 过期后变为 UNKNOWN（不确定状态，因为 QQ 群可能仍然活跃）
 * - 微信/其他: 过期后变为 INVALID（链接明确失效）
 *
 * ⚠️ 重要：此规则在 `lib/repositories/groups-search.ts` 的 SQL CASE WHEN 中有一份镜像实现。
 *    若修改此处映射，必须同步修改 SQL 中的 CASE WHEN 表达式，否则前后端筛选行为不一致。
 *
 * TODO: 未来考虑在 groups 表中增加 generated column `effective_status`，
 *       将规则下沉到数据库 schema，彻底消除前后端两份实现。
 */
export const EXPIRED_STATUS_MAP: Record<string, EffectiveStatus> = {
  qq: "UNKNOWN",
  wechat: "INVALID",
  other: "INVALID",
}

export function getEffectiveStatus(
  group: Pick<Group, "status" | "platform" | "expireAt">,
  now = new Date()
): EffectiveStatus {
  if (!group.expireAt || now <= group.expireAt) {
    return group.status
  }
  return EXPIRED_STATUS_MAP[group.platform] ?? "INVALID"
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
