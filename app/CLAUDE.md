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
    ├── [[...slugs]]/route.ts     # ElysiaJS Worker API（见 lib/api/CLAUDE.md）
    ├── admin/                    # 旧版 REST API（已被 ElysiaJS 替代，可能废弃）
    │   ├── groups/route.ts
    │   ├── groups/[id]/route.ts
    │   └── settings/route.ts
    ├── health/route.ts           # 直接实现的简单健康检查
    └── worker/                   # 旧版 Worker API（已被 ElysiaJS 替代，可能废弃）
        ├── heartbeat/route.ts
        ├── config/route.ts
        └── groups/
            ├── route.ts
            ├── batch/route.ts
            ├── partial/route.ts
            └── [id]/route.ts
```

## 入口与启动

### 公开首页（`app/page.tsx`）

1. 调用 `checkInitialized()`，未初始化跳转 `/setup`
2. 并行查询：groups、groupCategories（按 sortOrder 排序）、settings
3. 渲染 `<HomePageClient>` 处理客户端筛选/搜索
4. `export const dynamic = "force-dynamic"`（禁用静态缓存）

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

- `app/api/admin/` 和 `app/api/worker/` 目录下的旧版 Route Handler 可能与 ElysiaJS 路由重叠（catch-all `[[...slugs]]` 优先级较低），建议评估是否可清理
- 所有管理后台页面均为 `force-dynamic`，通过 layout 统一声明

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `app/layout.tsx` | 根 Layout，字体配置 |
| `app/page.tsx` | 公开首页 |
| `app/setup/page.tsx` | 初始化向导页 |
| `app/setup/setup-form.tsx` | 初始化表单 |
| `app/api/auth/[...all]/route.ts` | Better Auth 入口 |
| `app/api/[[...slugs]]/route.ts` | ElysiaJS 入口 |

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-03-01 | 初次生成 |
