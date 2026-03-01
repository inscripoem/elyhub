# ElyHub

群聊管理平台。提供公开的群聊目录展示，以及带有 Worker 自动同步功能的管理后台。

## 功能

- **公开群聊目录**：以表格形式展示所有群聊，支持按状态筛选，二维码加群链接
- **管理后台**：创建/编辑/删除群聊，管理站点设置
- **Worker 集成**：通过独立 Worker 自动同步群聊状态、名称、头像、加群链接
- **初始化向导**：首次部署自动引导创建管理员账号

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **数据库**：PostgreSQL + Drizzle ORM
- **认证**：Better Auth（邮箱/密码 + Admin 插件）
- **UI**：Tailwind CSS v4 + shadcn/ui

## 快速开始

### 前置条件

- Node.js 18+ 或 Bun
- PostgreSQL 数据库

### 安装

```bash
bun install
```

### 配置环境变量

生产环境需复制 `.env.example` 并填写必填项：

```bash
cp .env.example .env.local
```

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `BETTER_AUTH_SECRET` | 会话签名密钥，任意随机字符串 |

### 启动

```bash
# 生产构建
bun run build
bun start
```

### 初始化

首次启动后访问 `http://localhost:3000/setup` 创建管理员账号。

管理后台入口：`http://localhost:3000/admin`

## 开发

### 数据库

项目提供 `docker-compose.yml`，通过 Docker Compose 在本地运行 PostgreSQL（**仅供开发使用，不建议用于生产**）：

```bash
docker compose up -d
```

### 环境变量

`.env.development` 已预置与 Docker Compose 数据库匹配的连接信息，开箱即用，无需额外配置。

如需覆盖某个变量，在 `.env.local`（gitignored）中设置即可，优先级高于 `.env.development`。

### 启动开发服务器

```bash
bun dev
```

数据库迁移会在首次请求时通过 `instrumentation.ts` 自动执行。

首次运行后访问 `http://localhost:3000/setup` 创建管理员账号。

## 数据库迁移

迁移在应用启动时通过 `instrumentation.ts` 自动执行。如需手动管理：

```bash
# 生成迁移文件
bun db:generate

# 推送 schema 变更（跳过迁移文件，仅开发用）
bun db:push
```

## Worker 集成

Worker 是独立运行的自动化服务，通过 HTTP 与 ElyHub 交互，负责同步群聊信息。

- 配置 `QQ_WORKER_SECRET` / `WECHAT_WORKER_SECRET` 环境变量启用对应平台
- 在管理后台「设置」页面开启平台全局 Worker 开关
- Worker 接入规范见 [docs/worker.md](docs/worker.md)

## 项目结构

```
app/
├── (public)/          # 公开首页（群聊目录）
├── admin/             # 管理后台（需登录）
├── setup/             # 初始化向导
└── api/
    ├── admin/         # 管理 API（Better Auth 鉴权）
    ├── worker/        # Worker API（Bearer Token 鉴权）
    └── auth/          # Better Auth 路由

db/schema/             # Drizzle 表定义
lib/
├── auth.ts            # Better Auth 配置
├── db.ts              # Drizzle 实例
├── worker-auth.ts     # Worker 鉴权中间件
├── status.ts          # 群聊有效状态计算
├── actions/           # Server Actions
└── repositories/      # 数据库查询封装
```
