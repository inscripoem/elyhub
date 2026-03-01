import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { platformEnum, statusEnum } from "./enums"
import { groupCategories } from "./group-categories"

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id").references(() => groupCategories.id, {
      onDelete: "set null",
    }),
    platform: platformEnum("platform").notNull(),
    alias: text("alias").notNull(),
    name: text("name"),
    qqNumber: text("qq_number"),
    joinLink: text("join_link"),
    adminQq: text("admin_qq"),
    status: statusEnum("status").notNull().default("UNKNOWN"),
    expireAt: timestamp("expire_at", { withTimezone: true }),
    avatarUrl: text("avatar_url"),
    useWorker: boolean("use_worker"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("groups_category_idx").on(t.categoryId),
    index("groups_platform_idx").on(t.platform),
    index("groups_status_idx").on(t.status),
    index("groups_expire_at_idx").on(t.expireAt),
    index("groups_platform_status_idx").on(t.platform, t.status),
  ]
)

export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
