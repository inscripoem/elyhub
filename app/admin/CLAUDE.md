[根目录](../../CLAUDE.md) > **app/admin**

# 管理后台模块

## 模块职责

提供受保护的管理后台，包括：
- 群聊 CRUD（在 Sheet 侧边栏中完成，无需跳页）
- 群聊分组管理（排序、增删改）
- Worker 状态监控（QQ / 微信 Worker 在线状态、能力、上次心跳）
- 站点设置（标题、头像、公告、Worker 全局开关）
- 登录 / 登出（Better Auth email+password）

## 目录结构

```
app/admin/
├── login/
│   ├── page.tsx          # 登录页（服务端）
│   └── login-form.tsx    # 登录表单（客户端）
└── (protected)/          # Route Group，所有子页面共享 layout 鉴权
    ├── layout.tsx         # 鉴权 layout：检查 initialized + admin session
    ├── page.tsx           # /admin 根重定向或默认页
    ├── dashboard/
    │   ├── page.tsx       # Worker 状态看板（服务端）
    │   └── worker-status-card.tsx  # Worker 卡片组件
    ├── groups/
    │   ├── page.tsx       # 群聊列表（服务端数据获取）
    │   ├── new/page.tsx   # 新建群聊页（服务端，渲染 GroupForm）
    │   ├── [id]/edit/page.tsx  # 编辑群聊页（服务端，渲染 GroupForm）
    │   └── categories/page.tsx # 分组管理（服务端，渲染 CategoryListClient）
    └── settings/
        ├── page.tsx       # 站点设置（服务端）
        └── settings-form.tsx  # 设置表单（客户端）
```

## 入口与启动

- 访问 `/admin` 自动检查初始化状态，未初始化跳转 `/setup`
- 鉴权双重保障：layout 层 `getSession()` 检查 + Server Actions 中 `requireAdmin()`
- `(protected)/layout.tsx` 同时校验 `initialized` 和 `session.user.role === "admin"`

## 关键页面与组件

### 群聊管理（核心）

`app/admin/(protected)/groups/page.tsx` 是数据入口，传递给 `GroupsPageClient`：
- 数据：`categories`、`settings`（Worker 开关）、`workerRegistrations`
- 客户端 `GroupsPageClient` 通过 `fetch('/api/admin/groups?...')` 按需获取群聊数据（搜索/筛选/分页参数传给后端）
- 客户端处理：搜索、筛选（平台/状态/分组）、分页（PAGE_SIZE=20）、批量删除、Sheet 内联编辑
- 筛选/分页变化时自动重新 fetch，新增/编辑成功后 `router.refresh() + fetchData()`

`GroupForm` (`components/admin/group-form.tsx`) 用于新建和编辑：
- 平台切换时动态显示/隐藏字段（QQ 群号仅 QQ 平台显示）
- Worker 字段锁定：当 Worker 在线且已接管该字段时，设为只读
- `useWorker` 三值：`null`=跟随全局、`true`=强制开、`false`=强制关

### Worker 状态看板

`app/admin/(protected)/dashboard/page.tsx`：
- 查询 `workerRegistrations` 表，调用 `isWorkerOnline()` 判断是否在线
- 在线阈值：`lastSeenAt + (expectedIntervalSeconds + 300) * 1000 > now`

## 权限模型

```
Server Action 权限模式：
- createGroup / updateGroup → return { error: "Unauthorized" }（Sheet 场景）
- deleteGroup / deleteGroups / 分组操作 / settings → redirect("/admin/login")（独立操作）
```

所有 Server Action 第一行必须是：

```typescript
const session = await requireAdmin()
if (!session) return { error: "Unauthorized" } // 或 redirect("/admin/login")
```

## 关键依赖与配置

- `lib/auth-server.ts`：`requireAdmin()`、`getSession()`
- `lib/actions/groups.ts`：createGroup、updateGroup、deleteGroup、deleteGroups
- `lib/actions/group-categories.ts`：createCategory、updateCategory、deleteCategory、reorderCategory
- `lib/actions/settings.ts`：updateSettings
- `lib/status.ts`：`getEffectiveStatus()` 用于前端状态筛选和显示
- `lib/worker-utils.ts`：`isWorkerOnline()` 判断 Worker 是否在线

## 常见问题 (FAQ)

**Q: 为什么编辑群聊不跳页，在 Sheet 里完成？**
A: Sheet 侧边栏模式下，createGroup/updateGroup 返回 `{ error }` 而非 redirect。`router.refresh()` 刷新数据而不丢失列表状态。

**Q: Worker 字段被锁定无法编辑是什么原因？**
A: 当 `effectiveWorker=true`（开启 Worker 同步）且 Worker 在线、且该 Worker 声明了对应能力（`capabilities`）时，字段变为只读，防止人工修改被 Worker 覆盖。

**Q: 状态筛选为什么要用 getEffectiveStatus 而非 group.status？**
A: `expireAt` 过期时实际状态与存储状态不同（微信群过期变 INVALID，QQ 群过期变 UNKNOWN），直接读 `group.status` 会显示错误状态。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `app/admin/(protected)/layout.tsx` | 鉴权 Layout |
| `app/admin/(protected)/dashboard/page.tsx` | Worker 状态看板 |
| `app/admin/(protected)/groups/page.tsx` | 群聊列表（数据入口） |
| `app/admin/(protected)/groups/new/page.tsx` | 新建群聊 |
| `app/admin/(protected)/groups/[id]/edit/page.tsx` | 编辑群聊 |
| `app/admin/(protected)/groups/categories/page.tsx` | 分组管理 |
| `app/admin/(protected)/settings/page.tsx` | 站点设置 |
| `components/admin/groups-page-client.tsx` | 群聊列表客户端（筛选/排序/分页/Sheet） |
| `components/admin/group-form.tsx` | 群聊表单（新建/编辑） |
| `components/admin/category-list-client.tsx` | 分组列表（增删改排序） |
| `components/admin/category-form.tsx` | 分组表单 |
| `components/admin/admin-sidebar.tsx` | 管理后台侧边栏导航 |
| `components/admin/delete-group-button.tsx` | 单个删除按钮（带确认弹框） |
| `lib/actions/groups.ts` | 群聊 Server Actions |
| `lib/actions/group-categories.ts` | 分组 Server Actions |
| `lib/actions/settings.ts` | 设置 Server Actions |
| `app/api/admin/groups/route.ts` | 管理后台分页 API（`searchGroupsPaginated`） |

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-23 | 群聊列表改为 API 驱动（`fetch /api/admin/groups`），服务端不再全量传递 groups |
| 2026-03-01 | 初次生成 |
