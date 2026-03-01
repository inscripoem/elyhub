import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  siteTitle: text("site_title").notNull().default("ElyHub"),
  siteAvatarUrl: text("site_avatar_url"),
  qqWorkerEnabled: boolean("qq_worker_enabled").notNull().default(false),
  wechatWorkerEnabled: boolean("wechat_worker_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Settings = typeof settings.$inferSelect
