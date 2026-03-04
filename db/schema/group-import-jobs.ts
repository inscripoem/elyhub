import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const groupImportModeEnum = pgEnum("group_import_mode", [
  "standard",
  "round_trip",
])

export const groupImportStatusEnum = pgEnum("group_import_status", [
  "PARSED",
  "EXECUTED",
])

export type GroupImportPayloadRow = {
  rowNumber: number
  op: "insert" | "update"
  data: {
    id?: string
    platform: "qq" | "wechat" | "other"
    alias: string
    name: string | null
    qqNumber: string | null
    joinLink: string | null
    adminQq: string | null
    avatarUrl: string | null
    useWorker: boolean | null
    expireAt: string | null
    categoryId: string | null
    categoryName: string | null
  }
}

export type GroupImportSummary = {
  totalRows: number
  validRows: number
  errorRows: number
  insertCount: number
  updateCount: number
}

export type GroupImportError = {
  rowNumber: number
  messages: string[]
}

export const groupImportJobs = pgTable(
  "group_import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: text("created_by_user_id").notNull(),
    mode: groupImportModeEnum("mode").notNull(),
    status: groupImportStatusEnum("status").notNull().default("PARSED"),
    sourceFileName: text("source_file_name").notNull(),
    sourceFileSizeBytes: integer("source_file_size_bytes").notNull(),
    payload: jsonb("payload")
      .$type<{ rows: GroupImportPayloadRow[] }>()
      .notNull(),
    summary: jsonb("summary").$type<GroupImportSummary>().notNull(),
    errors: jsonb("errors").$type<GroupImportError[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("group_import_jobs_user_idx").on(t.createdByUserId),
    index("group_import_jobs_expires_at_idx").on(t.expiresAt),
    index("group_import_jobs_status_idx").on(t.status),
  ]
)

export type GroupImportJob = typeof groupImportJobs.$inferSelect
export type NewGroupImportJob = typeof groupImportJobs.$inferInsert
