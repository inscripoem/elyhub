import { db } from "@/lib/db"
import { settings } from "@/db/schema"

export async function generateMetadata() {
  const [row] = await db.select().from(settings).limit(1)
  return {
    title: row?.siteTitle ?? "ElyHub",
  }
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
