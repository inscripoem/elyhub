import { Elysia, t } from "elysia"

export const healthPlugin = new Elysia().get(
  "/health",
  () => ({ ok: true, timestamp: new Date().toISOString() }),
  {
    response: {
      200: t.Object({ ok: t.Boolean(), timestamp: t.String({ format: "date-time" }) }),
    },
    detail: {
      tags: ["Health"],
      summary: "Health check",
      operationId: "healthCheck",
    },
  }
)
