import { t } from "elysia"

export const PlatformEnum = t.Union(
  [t.Literal("qq"), t.Literal("wechat"), t.Literal("other")],
  { $id: "PlatformEnum", description: "Supported platforms" }
)

export const WorkerPlatform = t.Union(
  [t.Literal("qq"), t.Literal("wechat")],
  { $id: "WorkerPlatform", description: "Worker-supported platforms" }
)

export const StatusEnum = t.Union(
  [t.Literal("ACTIVE"), t.Literal("INVALID"), t.Literal("UNKNOWN")],
  { $id: "StatusEnum", description: "Group sync status" }
)

export const GroupRow = t.Object(
  {
    id: t.String({ format: "uuid" }),
    platform: PlatformEnum,
    alias: t.String(),
    name: t.Nullable(t.String()),
    qqNumber: t.Nullable(t.String()),
    joinLink: t.Nullable(t.String({ format: "uri" })),
    adminQq: t.Nullable(t.String()),
    status: StatusEnum,
    expireAt: t.Nullable(t.String({ format: "date-time" })),
    avatarUrl: t.Nullable(t.String({ format: "uri" })),
    useWorker: t.Nullable(t.Boolean()),
    createdAt: t.String({ format: "date-time" }),
    updatedAt: t.String({ format: "date-time" }),
  },
  { $id: "GroupRow" }
)

export const ErrorBody = t.Object(
  { error: t.String({ description: "Human-readable error message" }) },
  { $id: "ErrorBody" }
)
