import { db } from "@/lib/db"
import { groupCategories } from "@/db/schema"
import { asc } from "drizzle-orm"
import { CategoryListClient } from "@/components/admin/category-list-client"

export default async function CategoriesPage() {
  const categories = await db
    .select()
    .from(groupCategories)
    .orderBy(asc(groupCategories.sortOrder))

  return <CategoryListClient categories={categories} />
}
