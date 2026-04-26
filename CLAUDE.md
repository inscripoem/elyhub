# ElyHub - CLAUDE.md

> 变更记录 (Changelog)
> - 2026-03-01: 初次生成，全量扫描

---

## 项目愿景

ElyHub 是一个群聊导航站，支持 QQ、微信、其他平台的群聊统一管理与公开展示。提供管理后台（CRUD、分组、Worker 状态监控）和公开首页（筛选、搜索、二维码展示）。

---

## 开发约定（从实际经验总结）

### 包管理器

- 项目使用 **bun** 作为唯一包管理器，禁止使用 npm/npx
- 正确用法：`bun tsc --noEmit`、`bun run build`、`bunx drizzle-kit generate`、`bunx shadcn@latest add <component>`

### 数据库迁移工作流（重要）

- **禁止手动编写迁移文件**
- 修改 `db/schema/*.ts` 后，必须运行 `bunx drizzle-kit generate` 生成迁移
- drizzle-kit generate 会自动更新：`.sql` 迁移文件、`drizzle/meta/_journal.json`（migrator 靠此识别迁移）、`drizzle/meta/` 快照
- 若手动写 SQL 而不更新 `_journal.json`，migrator 不会执行该迁移，导致生产环境 DB 错误
- 迁移在应用启动时由 `instrumentation.ts` 自动执行（调用 `drizzle-orm/postgres-js/migrator`）

### 状态筛选

- 筛选群聊状态时必须使用 `getEffectiveStatus(group, now)` 而非原始 `group.status` 字段
- 原因：`status` 字段存储的是 **Worker 最后一次上报的值**，不随时间自动变化；`expireAt` 过期后展示态会降级（QQ → UNKNOWN，微信 → INVALID），但数据库字段本身不会更新
- 任何消费 `status` 的地方（页面渲染、API 响应、筛选逻辑）都必须经过 `getEffectiveStatus()`，直接读 `group.status` 会在数据过期后显示错误状态

### Server Actions 权限

- 所有 Server Actions 必须以 `requireAdmin()` 开头做权限校验
- createGroup/updateGroup 返回 `{ error: "Unauthorized" }` 而非 redirect（因为在 Sheet 中调用）
- deleteGroup/分组操作 使用 `redirect("/admin/login")` 因为是独立操作

### Settings 表设计

- settings 表为单行宽表设计（id=1），查询始终用 `.limit(1)`
- 新增设置字段走 schema 变更 + drizzle-kit generate，不使用 key-value 模式

---

## 架构总览

```
Next.js 15 App Router (React 19)
├── 公开展示层   app/(public)/  + app/page.tsx
├── 管理后台     app/admin/(protected)/
├── Auth API     app/api/auth/[...all]/   (Better Auth)
├── Worker API   app/api/[[...slugs]]/    (ElysiaJS)
├── Server Actions  lib/actions/
├── 数据层       lib/db.ts + lib/repositories/ + db/schema/
└── 组件库       components/ui/ (shadcn) + components/admin/ + components/public/
```

**技术栈：**

| 层次 | 技术 |
|------|------|
| 框架 | Next.js 16.1.6 (App Router) + React 19 |
| 语言 | TypeScript 5 (strict) |
| 样式 | Tailwind CSS 4 + shadcn/ui (Base UI + Radix UI) |
| ORM | Drizzle ORM 0.45 + postgres-js |
| 数据库 | PostgreSQL |
| 认证 | Better Auth 1.4 (email+password, admin plugin) |
| API | ElysiaJS (Worker Sync API，含 OpenAPI/Scalar 文档) |
| 表单校验 | Zod 4 + react-hook-form |
| 图标 | @tabler/icons-react |
| 包管理 | bun |

---

## 模块结构图

```mermaid
graph TD
    Root["(根) ElyHub"] --> App["app/"]
    Root --> Lib["lib/"]
    Root --> DB["db/"]
    Root --> Components["components/"]
    Root --> Drizzle["drizzle/ (迁移文件)"]

    App --> AppPublic["(public)/ 公开首页"]
    App --> AppAdmin["admin/ 管理后台"]
    App --> AppApi["api/ HTTP 接口"]
    App --> AppSetup["setup/ 初始化向导"]

    AppAdmin --> AdminProtected["(protected)/ 受保护页面"]
    AdminProtected --> Dashboard["dashboard/ Worker 状态"]
    AdminProtected --> Groups["groups/ 群聊管理"]
    AdminProtected --> Settings["settings/ 站点设置"]

    AppApi --> ApiAuth["auth/[...all]/ Better Auth"]
    AppApi --> ApiSlugs["[[...slugs]]/ ElysiaJS"]

    Lib --> LibActions["actions/ Server Actions"]
    Lib --> LibRepos["repositories/ 数据访问"]
    Lib --> LibApi["api/ ElysiaJS 路由定义"]

    DB --> DBSchema["schema/ Drizzle 表定义"]

    Components --> CompUI["ui/ shadcn 组件"]
    Components --> CompAdmin["admin/ 管理后台组件"]
    Components --> CompPublic["public/ 公开页面组件"]

    click AppPublic "./app/(public)/CLAUDE.md" "公开展示模块"
    click AdminProtected "./app/admin/CLAUDE.md" "管理后台模块"
    click LibApi "./lib/api/CLAUDE.md" "Worker API 模块"
    click DBSchema "./db/CLAUDE.md" "数据模型模块"
```

---

## 模块索引

| 模块路径 | 职责 | 文档 |
|---------|------|------|
| `app/page.tsx` + `app/(public)/` | 公开首页，群聊展示、筛选、搜索 | [查看](./app/CLAUDE.md) |
| `app/admin/(protected)/` | 管理后台，群聊 CRUD、分组、Worker 监控、站点设置 | [查看](./app/admin/CLAUDE.md) |
| `app/setup/` | 首次初始化向导（创建管理员账号和站点标题） | - |
| `app/api/[[...slugs]]/` | ElysiaJS Worker Sync API，含 OpenAPI 文档 | [查看](./lib/api/CLAUDE.md) |
| `app/api/auth/[...all]/` | Better Auth 认证端点 | - |
| `lib/actions/` | Server Actions：groups、group-categories、settings、setup | - |
| `lib/repositories/` | 数据访问层：groups、settings、worker-registrations | - |
| `lib/auth.ts` / `lib/auth-server.ts` | Better Auth 配置与服务端会话工具 | - |
| `lib/status.ts` | `getEffectiveStatus()` 和 `isWorkerManaged()` 工具函数 | - |
| `lib/worker-auth.ts` | Worker 请求鉴权（Bearer token + X-Worker-Platform 头） | - |
| `lib/worker-utils.ts` | `isWorkerOnline()` Worker 在线状态判断 | - |
| `lib/repositories/groups-search.ts` | 群聊搜索/筛选/分页 repository（供公开页、Worker API、管理后台） | - |
| `db/schema/` | Drizzle 表定义（groups、settings、group-categories 等） | [查看](./db/CLAUDE.md) |
| `drizzle/` | 自动生成的迁移 SQL 和 meta/_journal.json | - |
| `components/ui/` | shadcn/ui 组件库 | - |
| `components/admin/` | 管理后台专用组件（GroupForm、GroupsPageClient 等） | - |
| `components/public/` | 公开页面组件（StatusBadge、PlatformIcon、GroupSection 等） | - |

---

## 运行与开发

### 环境变量

复制 `.env.example` 并填写（开发可直接使用 `.env.development`）：

```bash
# 必填
DATABASE_URL=postgresql://user:password@localhost:5432/elyhub
BETTER_AUTH_SECRET=<随机字符串，生成：bun run secret>
BETTER_AUTH_URL=http://localhost:3000

# 可选：Worker 集成
QQ_WORKER_SECRET=<qq-worker-token>
WECHAT_WORKER_SECRET=<wechat-worker-token>
```

### 开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器（迁移在启动时自动执行）
bun run dev

# 类型检查
bun tsc --noEmit

# Lint
bun run lint

# 构建
bun run build

# 数据库操作
bunx drizzle-kit generate   # 修改 schema 后生成迁移（必须用此命令）
bunx drizzle-kit push       # 直接推送（仅开发/调试）
bun run secret              # 生成随机 BETTER_AUTH_SECRET
```

### 首次初始化

1. 配置 `DATABASE_URL`，确保 PostgreSQL 可连接
2. 启动应用：`bun run dev`
3. 访问 `http://localhost:3000` 自动跳转到 `/setup` 初始化向导
4. 填写管理员账号和站点名称，完成初始化

### Worker API 文档

启动后访问 `http://localhost:3000/api/docs`（Scalar UI）查看 Worker Sync API 交互文档。

### Docker Compose（开发用 PostgreSQL）

项目根目录有 `compose.yml`（如存在）可一键启动 PostgreSQL：

```bash
docker compose up -d
```

---

## 测试策略

**当前状态：暂无自动化测试（缺口）。**

- 未发现 `*.test.ts`、`*.spec.ts` 文件
- 建议优先补充：
  - `lib/status.ts` 中 `getEffectiveStatus()` 的单元测试（边界：expireAt 恰好过期，不同平台行为）
  - Worker API 端点的集成测试（鉴权、批量更新事务）
  - Server Actions 的单元测试（权限校验路径）

---

## 编码规范

- **TypeScript strict 模式**，禁止 `any`（除非明确注释原因）
- 路径别名 `@/*` 映射到根目录（`tsconfig.json`）
- 文件命名：页面用 `page.tsx`，客户端组件用 `*-client.tsx` 或 `*-form.tsx`
- Server Components 默认，客户端交互加 `"use client"`
- Server Actions 文件顶部加 `"use server"`，第一行调用 `requireAdmin()`
- 状态显示必须调用 `getEffectiveStatus()`，不可直接读 `group.status`
- shadcn 组件安装：`bunx shadcn@latest add <component>`

---

## AI 使用指引

### 高风险操作（必须人工确认）

- 修改 `db/schema/` 后，确认已运行 `bunx drizzle-kit generate`，不要手动改 SQL
- 新增 Server Action 时，确认第一行是 `requireAdmin()`
- 群聊状态相关逻辑，确认使用 `getEffectiveStatus()` 而非 `group.status`

### 常见陷阱

- `settings` 表查询必须加 `.limit(1)`，不要写 `.findFirst()` 等替代语法
- Worker API 鉴权需同时验证 `Authorization: Bearer` 和 `X-Worker-Platform` 头
- `useWorker` 字段三值语义：`true`=强制开启、`false`=强制关闭、`null`=跟随全局设置
- `expireAt` 字段仅对微信群聊有实际业务意义（QQ 群过期后变为 UNKNOWN，微信变为 INVALID）

### 模块新增指引

- 新增 API 端点：在 `lib/api/` 中创建 ElysiaJS plugin，在 `lib/api/index.ts` 中 `.use()` 挂载
- 新增 Server Action：在 `lib/actions/` 中创建，遵循权限校验规范
- 新增数据库表：在 `db/schema/` 中添加，在 `db/schema/index.ts` 中 re-export，运行 `bunx drizzle-kit generate`

---

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-26 | groups 表添加 `lastSyncedAt` 字段；Worker 同步时自动记录；StatusBadge 支持 Tooltip 显示同步时间 |
| 2026-04-23 | 群聊搜索/筛选/分页后端化；新增 `lib/repositories/groups-search.ts`；清理旧版 API 死代码；Worker API 增加 `search`/`status` 参数 |
| 2026-03-01 | 初次生成 CLAUDE.md，全量扫描项目结构 |
