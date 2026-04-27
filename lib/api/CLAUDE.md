[根目录](../../CLAUDE.md) > [lib](../) > **api**

# Worker Sync API 模块

## 模块职责

基于 ElysiaJS 实现的 Worker 同步 HTTP API，挂载在 Next.js `app/api/[[...slugs]]/route.ts`。

功能：
- Worker 心跳注册（upsert `worker_registrations` 表）
- 查询平台群聊列表（全量 / 缺字段过滤）
- 单条 / 批量更新群聊信息（状态、名称、头像、链接、过期时间）
- 查询 Worker 配置（是否已启用）
- OpenAPI 文档（Scalar UI）

## 入口与启动

```
app/api/[[...slugs]]/route.ts
  └── lib/api/index.ts          # Elysia app，prefix=/api
       └── lib/api/worker.ts    # /api/worker/* 所有端点
```

Next.js catch-all 路由将所有 HTTP 方法（GET/POST/PUT/PATCH/DELETE 等）转发给 `app.fetch`。

## 对外接口

所有 Worker 端点需要以下请求头：

```
Authorization: Bearer <platform-secret>
X-Worker-Platform: qq | wechat
```

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/docs` | OpenAPI Scalar UI |
| POST | `/api/worker/heartbeat` | Worker 心跳，更新注册信息 |
| GET | `/api/worker/groups?platform=qq&search=...&status=...` | 获取平台群聊（支持搜索/状态筛选） |
| GET | `/api/worker/groups/partial?platform=qq&missing=status,name` | 获取缺字段群聊 |
| PATCH | `/api/worker/groups/:id` | 更新单条群聊 |
| POST | `/api/worker/groups/batch` | 批量更新群聊（1-100条，事务） |
| GET | `/api/worker/config` | 获取平台启用状态 |

### 鉴权逻辑

```typescript
// validateWorkerToken(request)
// 1. 校验 Authorization: Bearer <token>
// 2. 校验 X-Worker-Platform: qq | wechat
// 3. 对比 QQ_WORKER_SECRET / WECHAT_WORKER_SECRET 环境变量
```

平台隔离：Worker 只能操作与自身平台匹配的群聊，`GET /groups?platform=xxx` 中 platform 必须与 token 所属平台一致。

### 缺字段查询（`/groups/partial`）

`missing` 参数支持逗号分隔：`status`, `name`, `avatar_url`, `join_link`。返回任意一个字段为 null 的群聊。

### 批量更新（`/groups/batch`）

- 请求体：数组，1-100 条
- 事务执行，返回 `{ updated: string[], notFound: string[] }`
- 仅更新与 Worker 平台匹配的群聊
- 每次更新都会同时写入 `lastSyncedAt` 为当前时间

## 关键依赖与配置

- `elysia`、`@elysiajs/openapi`：API 框架和文档
- `lib/repositories/groups.ts`：群聊数据访问（listGroupsByPlatform 等）
- `lib/repositories/settings.ts`：getSettings（查询 Worker 启用状态）
- `lib/repositories/worker-registrations.ts`：upsertWorkerRegistration
- `lib/api/schemas.ts`：Elysia TypeBox schema 定义（GroupRow、StatusEnum 等）
- 环境变量：`QQ_WORKER_SECRET`、`WECHAT_WORKER_SECRET`

## 数据模型（API 层）

GroupRow schema（来自 `lib/api/schemas.ts`）：

```typescript
{
  id: string (uuid)
  platform: "qq" | "wechat" | "other"
  alias: string
  name: string | null
  qqNumber: string | null
  joinLink: string | null (uri)
  adminQq: string | null
  status: "ACTIVE" | "INVALID" | "UNKNOWN"
  expireAt: string | null (date-time)
  avatarUrl: string | null (uri)
  useWorker: boolean | null
  createdAt: string (date-time)
  updatedAt: string (date-time)
  lastSyncedAt: string | null (date-time)
}
```

注意：API 返回的是序列化后的字符串时间（ISO-8601），`expireAt` 等 Date 字段在 `serializeGroup()` 中转换。

## 测试与质量

- 无自动化测试（缺口）
- 可通过 `/api/docs` Scalar UI 手动测试所有端点
- 建议补充：鉴权失败场景测试、批量更新事务回滚测试

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `app/api/[[...slugs]]/route.ts` | Next.js 入口，转发给 Elysia |
| `lib/api/index.ts` | Elysia app，挂载 worker plugin |
| `lib/api/worker.ts` | Worker 所有端点 |
| `lib/api/schemas.ts` | TypeBox schema 定义 |
| `lib/repositories/groups.ts` | 群聊数据访问 |
| `lib/repositories/settings.ts` | 设置数据访问 |
| `lib/repositories/worker-registrations.ts` | Worker 注册数据访问 |

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-26 | Worker 同步更新时自动注入 `lastSyncedAt`；GroupRow schema 添加 `lastSyncedAt` 字段 |
| 2026-04-23 | `GET /api/worker/groups` 增加 `search`（模糊搜索）和 `status`（有效状态筛选）参数；清理旧版 Route Handler 死代码 |
| 2026-03-01 | 初次生成 |
