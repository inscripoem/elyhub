[根目录](../CLAUDE.md) > **app**

# App 路由模块

## 模块职责

Next.js 15 App Router 的页面层，包含公开首页、管理后台、Auth 接口和 Worker API 入口。

## 目录结构

```
app/
├── layout.tsx              # 根 Layout（字体、全局 CSS）
├── page.tsx                # 公开首页 / 入口（Server Component）
├── globals.css             # 全局样式（Tailwind 导入）
├── (public)/               # 公开区域 Route Group（目前仅 layout）
│   └── layout.tsx
├── setup/                  # 初始化向导
│   ├── page.tsx
│   └── setup-form.tsx      # 注册管理员表单
├── admin/                  # 管理后台
│   ├── login/              # 登录页
│   └── (protected)/        # 受保护页面（见 app/admin/CLAUDE.md）
└── api/
    ├── auth/[...all]/route.ts    # Better Auth 端点
    ├── admin/                    # Admin Route Handler（分页查询、Excel 导出）
    │   ├── groups/route.ts       # GET 分页列表（供管理后台表格）
    │   ├── groups/export/route.ts       # GET Excel 导出
    │   └── groups/import-template/route.ts  # GET 导入模板
    ├── public/                   # 公开 API（无需鉴权）
    │   └── groups/route.ts       # GET 筛选列表（供公开首页）
    ├── health/route.ts           # 原生健康检查
    └── [[...slugs]]/route.ts     # ElysiaJS Worker API + OpenAPI 文档（见 lib/api/CLAUDE.md）
```

## 入口与启动

### 公开首页（`app/page.tsx`）

1. 调用 `checkInitialized()`，未初始化跳转 `/setup`
2. 读取 URL searchParams，调用 `searchGroups()` 做服务端筛选（搜索/平台/状态）
3. 并行查询：groupCategories（按 sortOrder 排序）、settings
4. 渲染 `<HomePageClient>` 处理分组展示和搜索交互（搜索框通过 URL 驱动，debounce + `router.replace`）
5. `export const dynamic = "force-dynamic"`（禁用静态缓存）

### 初始化向导（`app/setup/`）

- `page.tsx`：检查已初始化则跳转 `/admin`
- `setup-form.tsx`：调用 `runSetup()` Server Action，创建 settings 行 + admin 用户

### Admin 管理后台

详见 [app/admin/CLAUDE.md](./admin/CLAUDE.md)。

### Auth API（`app/api/auth/[...all]/route.ts`）

```typescript
import { toNextJsHandler } from "better-auth/next-js"
export const { GET, POST } = toNextJsHandler(auth)
```

提供：登录、注册、登出、会话管理等 Better Auth 默认端点。

### Worker API（`app/api/[[...slugs]]/route.ts`）

```typescript
export const GET = app.fetch  // Elysia app 处理所有方法
// ...
```

详见 [lib/api/CLAUDE.md](../lib/api/CLAUDE.md)。

## 注意事项

- `app/api/worker/` 旧版 Route Handler 已清理，Worker API 全部由 ElysiaJS 接管；Admin API 保留分页查询和导出/导入模板功能，其余 CRUD 由 Server Actions 处理
- 所有管理后台页面均为 `force-dynamic`，通过 layout 统一声明

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `app/layout.tsx` | 根 Layout，字体配置 |
| `app/page.tsx` | 公开首页（服务端筛选） |
| `app/setup/page.tsx` | 初始化向导页 |
| `app/setup/setup-form.tsx` | 初始化表单 |
| `app/api/auth/[...all]/route.ts` | Better Auth 入口 |
| `app/api/[[...slugs]]/route.ts` | ElysiaJS 入口 |
| `app/api/admin/groups/route.ts` | 管理后台分页 API |
| `app/api/public/groups/route.ts` | 公开筛选 API |

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-23 | 群聊搜索/筛选/分页后端化；清理旧版 `app/api/worker/` 和 `app/api/admin/` 死代码；公开首页改为服务端筛选 |
| 2026-03-01 | 初次生成 |
