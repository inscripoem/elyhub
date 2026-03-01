[根目录](../CLAUDE.md) > **db**

# 数据模型模块

## 模块职责

定义所有 PostgreSQL 表结构（Drizzle ORM），供全项目共享使用。迁移文件由 `drizzle-kit generate` 自动生成，存放在 `drizzle/` 目录。

## 入口

- `db/schema/index.ts`：统一 re-export 所有表和类型
- `lib/db.ts`：创建并导出 Drizzle 实例（懒加载单例，代理模式）

## 数据模型详解

### groups（群聊表）

核心业务表。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 自动生成 |
| categoryId | uuid FK | 关联 group_categories，删除分组时 SET NULL |
| platform | enum | `qq` / `wechat` / `other` |
| alias | text NOT NULL | 显示别名（管理员自定义） |
| name | text | 群实际名称（可由 Worker 同步） |
| qqNumber | text | QQ 群号（仅 QQ 平台） |
| joinLink | text | 加群链接（可由 Worker 同步） |
| adminQq | text | 管理员 QQ（仅 QQ 平台） |
| status | enum | `ACTIVE` / `INVALID` / `UNKNOWN`，默认 UNKNOWN |
| expireAt | timestamp tz | 二维码到期时间（主要用于微信群） |
| avatarUrl | text | 头像 URL（可由 Worker 同步） |
| useWorker | boolean nullable | 三值：true=强制开、false=强制关、null=跟随全局 |
| createdAt | timestamp tz | 创建时间 |
| updatedAt | timestamp tz | 更新时间（`$onUpdate` 自动更新） |

**索引：** category_idx、platform_idx、status_idx、expire_at_idx、platform_status_idx（复合）

**重要约定：** 读取状态必须用 `getEffectiveStatus(group, now)` 而非直接读 `status` 字段。

```typescript
// lib/status.ts
function getEffectiveStatus(group, now): "ACTIVE" | "INVALID" | "UNKNOWN" {
  if (!group.expireAt || now <= group.expireAt) return group.status
  return group.platform === "qq" ? "UNKNOWN" : "INVALID"
}
```

### group_categories（群聊分组表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 自动生成 |
| name | text NOT NULL UNIQUE | 分组名称（唯一） |
| description | text | 分组描述 |
| sortOrder | integer NOT NULL | 排序权重，越小越靠前 |
| createdAt | timestamp tz | |
| updatedAt | timestamp tz | |

排序通过交换 sortOrder 实现（`reorderCategory` action 在事务中三步 swap）。

### settings（站点设置表，单行宽表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 始终为 1 |
| siteTitle | text NOT NULL | 站点名称，默认 "ElyHub" |
| siteAvatarUrl | text | 站点头像 URL |
| siteAnnouncement | text | 公告内容（公开首页显示） |
| qqWorkerEnabled | boolean NOT NULL | QQ Worker 全局开关 |
| wechatWorkerEnabled | boolean NOT NULL | 微信 Worker 全局开关 |
| createdAt / updatedAt | timestamp tz | |

**约定：** 查询始终加 `.limit(1)`，新增字段走 schema 变更，不用 key-value 模式。

### worker_registrations（Worker 注册表）

| 字段 | 类型 | 说明 |
|------|------|------|
| platform | enum PK | `qq` / `wechat`（主键，每平台唯一一条） |
| capabilities | jsonb | Worker 声明的能力列表，如 `["status","name","avatar_url"]` |
| lastSeenAt | timestamp tz NOT NULL | 最后心跳时间 |
| expectedIntervalSeconds | integer NOT NULL | 心跳期望间隔（秒），默认 60 |

Worker 在线判断：`lastSeenAt + (expectedIntervalSeconds + 300) * 1000 > Date.now()`（容差 5 分钟）。

### auth 表（Better Auth 管理，勿手动修改）

- `user`：用户表，含 `role`（admin/user）、`banned` 等字段
- `session`：会话表
- `account`：OAuth 账号关联（当前仅 email+password）
- `verification`：验证码表

## 迁移工作流

```bash
# 1. 修改 db/schema/*.ts
# 2. 生成迁移文件（必须用 bunx，不要手动改 SQL）
bunx drizzle-kit generate

# 生成产物：
#   drizzle/XXXX_<tag>.sql         迁移 SQL
#   drizzle/meta/_journal.json     migrator 依赖此文件识别迁移
#   drizzle/meta/XXXX_snapshot.json

# 3. 启动应用，instrumentation.ts 自动执行迁移
bun run dev
```

**禁止：** 手动新建 `.sql` 文件。如果不更新 `_journal.json`，migrator 不会执行新迁移。

## 当前迁移历史

| 序号 | 文件 | 内容摘要 |
|------|------|------|
| 0000 | `0000_last_garia.sql` | 初始建表：groups、settings、worker_registrations、auth 表 |
| 0001 | `0001_easy_xorn.sql` | 添加 group_categories 表；groups 加 category_id；settings 加 site_announcement |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `db/schema/index.ts` | 统一导出 |
| `db/schema/enums.ts` | platform、group_status 枚举定义 |
| `db/schema/groups.ts` | groups 表 |
| `db/schema/group-categories.ts` | group_categories 表 |
| `db/schema/settings.ts` | settings 表 |
| `db/schema/worker-registrations.ts` | worker_registrations 表 |
| `db/schema/auth.ts` | Better Auth 管理的 4 张表 |
| `lib/db.ts` | Drizzle 实例（懒加载单例） |
| `drizzle.config.ts` | drizzle-kit 配置（schema 路径、输出目录、dialect） |
| `instrumentation.ts` | 应用启动时自动执行 migrate |
| `drizzle/meta/_journal.json` | migrator 迁移日志（勿手动修改） |

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-03-01 | 初次生成 |
