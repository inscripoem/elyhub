import { pgEnum } from "drizzle-orm/pg-core"

export const platformEnum = pgEnum("platform", ["qq", "wechat", "other"])

export const statusEnum = pgEnum("group_status", ["ACTIVE", "INVALID", "UNKNOWN"])
