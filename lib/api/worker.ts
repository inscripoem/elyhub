import { Elysia, t } from "elysia"
import {
  listGroupsWithMissingFields,
  updateGroupByPlatform,
  batchUpdateGroupsByPlatform,
  type GroupSelect,
} from "@/lib/repositories/groups"
import { searchGroups } from "@/lib/repositories/groups-search"
import { getSettings } from "@/lib/repositories/settings"
import { upsertWorkerRegistration } from "@/lib/repositories/worker-registrations"
import { WorkerPlatform, GroupRow, ErrorBody, StatusEnum, WorkerGroupQuery } from "./schemas"

type WorkerPlatformType = "qq" | "wechat"

const PLATFORM_SECRETS: Record<WorkerPlatformType, string | undefined> = {
  qq: process.env.QQ_WORKER_SECRET,
  wechat: process.env.WECHAT_WORKER_SECRET,
}

type AuthResult =
  | { ok: true; platform: WorkerPlatformType }
  | { ok: false; status: 401 | 403 | 422; message: string }

function validateWorkerToken(request: Request): AuthResult {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, message: "Missing or invalid Authorization header" }
  }
  const token = authHeader.slice(7).trim()
  const platformHeader = request.headers.get("x-worker-platform")
  if (platformHeader !== "qq" && platformHeader !== "wechat") {
    return { ok: false, status: 422, message: "Missing or invalid X-Worker-Platform header" }
  }
  const secret = PLATFORM_SECRETS[platformHeader]
  if (!secret || token !== secret) {
    return { ok: false, status: 403, message: "Invalid token for platform" }
  }
  return { ok: true, platform: platformHeader }
}

function serializeGroup(row: GroupSelect) {
  return {
    ...row,
    expireAt: row.expireAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  }
}

const workerGuard = new Elysia({ name: "worker-guard" })
  .derive({ as: "scoped" }, ({ request }) => {
    const auth = validateWorkerToken(request)
    return {
      workerPlatform: (auth.ok ? auth.platform : "") as WorkerPlatformType,
      _authError: auth.ok ? null : { status: auth.status, error: auth.message },
    }
  })
  .onBeforeHandle({ as: "scoped" }, ({ _authError, set }) => {
    if (_authError) {
      set.status = _authError.status
      return { error: _authError.error }
    }
  })

const workerHeaders = t.Object({
  authorization: t.String({ description: "Bearer <platform-secret>" }),
  "x-worker-platform": WorkerPlatform,
})

export const workerPlugin = new Elysia({
  prefix: "/worker",
  detail: { tags: ["Worker"], security: [{ bearerAuth: [] }] },
})
  .use(workerGuard)

  .post(
    "/heartbeat",
    async ({ body, workerPlatform }) => {
      await upsertWorkerRegistration({
        platform: workerPlatform,
        capabilities: body.capabilities ?? [],
        expectedIntervalSeconds: body.expectedIntervalSeconds ?? 60,
      })
      return { ok: true }
    },
    {
      headers: workerHeaders,
      body: t.Object({
        capabilities: t.Optional(t.Array(t.String(), { default: [] })),
        expectedIntervalSeconds: t.Optional(t.Integer({ minimum: 1, default: 60 })),
      }),
      response: {
        200: t.Object({ ok: t.Boolean() }),
        401: ErrorBody,
        403: ErrorBody,
        422: ErrorBody,
      },
      detail: {
        summary: "Worker heartbeat",
        description: "Registers or updates worker capabilities and last-seen timestamp.",
        operationId: "workerHeartbeat",
      },
    }
  )

  .get(
    "/groups",
    async ({ query, workerPlatform, set }) => {
      if (query.platform !== workerPlatform) {
        set.status = 403
        return { error: "Platform mismatch" } as never
      }
      const { items } = await searchGroups({
        platform: workerPlatform,
        search: query.search,
        status: query.status,
      })
      return { data: items.map(serializeGroup) }
    },
    {
      headers: workerHeaders,
      query: WorkerGroupQuery,
      response: {
        200: t.Object({ data: t.Array(GroupRow) }),
        401: ErrorBody,
        403: ErrorBody,
      },
      detail: {
        summary: "List groups for platform",
        description:
          "Returns groups belonging to the authenticated worker platform. Supports optional search (fuzzy on alias/name/qqNumber) and status filtering.",
        operationId: "workerListGroups",
      },
    }
  )

  .get(
    "/groups/partial",
    async ({ query, workerPlatform, set }) => {
      if (query.platform !== workerPlatform) {
        set.status = 403
        return { error: "Platform mismatch" } as never
      }
      const fields = (query.missing ?? "").split(",").map((f) => f.trim()).filter(Boolean)
      const rows = await listGroupsWithMissingFields(workerPlatform, fields)
      return { data: rows.map(serializeGroup) }
    },
    {
      headers: workerHeaders,
      query: t.Object({
        platform: WorkerPlatform,
        missing: t.Optional(
          t.String({ description: 'Comma-separated: "status,name,avatar_url,join_link"' })
        ),
      }),
      response: {
        200: t.Object({ data: t.Array(GroupRow) }),
        401: ErrorBody,
        403: ErrorBody,
      },
      detail: {
        summary: "List groups with missing fields",
        description: "Returns groups where any of the specified fields are null.",
        operationId: "workerListPartialGroups",
      },
    }
  )

  .patch(
    "/groups/:id",
    async ({ params, body, workerPlatform, set }) => {
      const updates: Record<string, unknown> = {}
      if (body.status !== undefined) updates.status = body.status
      if ("name" in body) updates.name = body.name ?? null
      if ("avatarUrl" in body) updates.avatarUrl = body.avatarUrl ?? null
      if ("joinLink" in body) updates.joinLink = body.joinLink ?? null
      if ("expireAt" in body) updates.expireAt = body.expireAt ? new Date(body.expireAt) : null
      updates.lastSyncedAt = new Date()

      if (Object.keys(updates).length === 1) {
        set.status = 400
        return { error: "No update fields provided" } as never
      }

      const row = await updateGroupByPlatform(params.id, workerPlatform, updates as never)
      if (!row) {
        set.status = 404
        return { error: "Not found or platform mismatch" } as never
      }
      return { data: serializeGroup(row) }
    },
    {
      headers: workerHeaders,
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        status: t.Optional(StatusEnum),
        name: t.Optional(t.Nullable(t.String())),
        avatarUrl: t.Optional(t.Nullable(t.String({ format: "uri" }))),
        joinLink: t.Optional(t.Nullable(t.String({ format: "uri" }))),
        expireAt: t.Optional(t.Nullable(t.String({ format: "date-time" }))),
      }),
      response: {
        200: t.Object({ data: GroupRow }),
        400: ErrorBody,
        401: ErrorBody,
        403: ErrorBody,
        404: ErrorBody,
        422: ErrorBody,
      },
      detail: {
        summary: "Update a group (worker)",
        description:
          "Worker updates group status, name, avatar, or link. Only modifies groups belonging to worker's platform.",
        operationId: "workerUpdateGroup",
      },
    }
  )

  .post(
    "/groups/batch",
    async ({ body, workerPlatform }) => {
      const items = body.map(({ expireAt, ...rest }) => ({
        ...rest,
        expireAt: expireAt != null ? new Date(expireAt) : expireAt,
        lastSyncedAt: new Date(),
      }))
      const results = await batchUpdateGroupsByPlatform(workerPlatform, items as never)
      return { ok: true, ...results }
    },
    {
      headers: workerHeaders,
      body: t.Array(
        t.Object({
          id: t.String({ format: "uuid" }),
          status: t.Optional(StatusEnum),
          name: t.Optional(t.Nullable(t.String())),
          avatarUrl: t.Optional(t.Nullable(t.String({ format: "uri" }))),
          joinLink: t.Optional(t.Nullable(t.String({ format: "uri" }))),
          expireAt: t.Optional(t.Nullable(t.String({ format: "date-time" }))),
        }),
        { minItems: 1, maxItems: 100 }
      ),
      response: {
        200: t.Object({
          ok: t.Boolean(),
          updated: t.Array(t.String({ format: "uuid" })),
          notFound: t.Array(t.String({ format: "uuid" })),
        }),
        401: ErrorBody,
        403: ErrorBody,
        422: ErrorBody,
      },
      detail: {
        summary: "Batch update groups",
        description: "Atomically updates 1–100 groups in a single transaction.",
        operationId: "workerBatchUpdateGroups",
      },
    }
  )

  .get(
    "/config",
    async ({ workerPlatform }) => {
      const row = await getSettings()
      const enabled =
        workerPlatform === "qq"
          ? (row?.qqWorkerEnabled ?? false)
          : (row?.wechatWorkerEnabled ?? false)
      return { platform: workerPlatform, enabled }
    },
    {
      headers: workerHeaders,
      response: {
        200: t.Object({
          platform: WorkerPlatform,
          enabled: t.Boolean({
            description: "Whether this platform is enabled in site settings",
          }),
        }),
        401: ErrorBody,
        403: ErrorBody,
      },
      detail: {
        summary: "Get worker config",
        description:
          "Returns whether the authenticated worker's platform is enabled in site settings.",
        operationId: "workerGetConfig",
      },
    }
  )
