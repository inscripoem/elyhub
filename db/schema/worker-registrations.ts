import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core"
import { platformEnum } from "./enums"

export const workerRegistrations = pgTable("worker_registrations", {
  platform: platformEnum("platform").primaryKey(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  expectedIntervalSeconds: integer("expected_interval_seconds")
    .notNull()
    .default(60),
})

export type WorkerRegistration = typeof workerRegistrations.$inferSelect
