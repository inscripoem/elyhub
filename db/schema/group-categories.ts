import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const groupCategories = pgTable(
  "group_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("group_categories_name_idx").on(t.name),
    index("group_categories_sort_order_idx").on(t.sortOrder),
  ]
)

export type GroupCategory = typeof groupCategories.$inferSelect
export type NewGroupCategory = typeof groupCategories.$inferInsert
