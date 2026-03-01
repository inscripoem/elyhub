export async function register() {
  // Only run on Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator")
    const { getDb } = await import("@/lib/db")
    await migrate(getDb(), { migrationsFolder: "./drizzle" })
  }
}
