import { Elysia } from "elysia"
import { openapi } from "@elysiajs/openapi"
import { workerPlugin } from "./worker"

export const app = new Elysia({ prefix: "/api" })
  .use(
    openapi({
      path: "/docs",
      provider: "scalar",
      documentation: {
        info: {
          title: "ElyHub API",
          version: "1.0.0",
          description:
            "Worker synchronization API for ElyHub.\n\nRequires `Authorization: Bearer <secret>` and `X-Worker-Platform: qq|wechat`.",
        },
        tags: [
          { name: "Worker", description: "Worker node sync endpoints." },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              description:
                "Worker platform secret. Must also include `X-Worker-Platform` header.",
            },
          },
        },
      },
      scalar: { theme: "purple", defaultOpenAllTags: true },
    })
  )
  .use(workerPlugin)
