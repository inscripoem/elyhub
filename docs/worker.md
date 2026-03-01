# ElyHub Worker 接入规范

Worker 是独立于 ElyHub 主程序运行的自动化服务，通过 HTTP 轮询与 ElyHub 交互，负责将群聊信息（名称、头像、加群链接、状态）同步回 ElyHub。Worker 可以用任何语言实现，只需能发 HTTP 请求即可。

---

## 认证

所有 Worker API 请求必须同时携带以下两个 Header：

```
Authorization: Bearer <secret>
X-Worker-Platform: qq | wechat
```

`secret` 由 ElyHub 部署方通过环境变量配置：

| 平台 | 环境变量 |
|------|---------|
| QQ | `QQ_WORKER_SECRET` |
| 微信 | `WECHAT_WORKER_SECRET` |

每个 Worker 只能操作与其 Token 对应的平台数据，跨平台访问会被拒绝。

**错误响应：**

| 情况 | HTTP 状态码 |
|------|------------|
| 缺少 Authorization 头 | `401` |
| X-Worker-Platform 缺失或值无效 | `422` |
| Token 与平台不匹配 | `403` |

---

## 推荐工作循环

```
启动
│
├─ 1. GET /api/worker/config
│      检查平台是否已被管理员启用
│      enabled=false → 等待后重试，不执行后续操作
│
├─ 2. POST /api/worker/heartbeat
│      上报 capabilities 和心跳间隔，完成注册
│
├─ 3. GET /api/worker/groups/partial?missing=name,avatar_url,...
│      获取尚缺信息的群，进行初始填充
│
└─ 循环（每 expectedIntervalSeconds 秒）：
       ├─ POST /api/worker/heartbeat        保活
       ├─ 扫描各群，判断状态
       └─ POST /api/worker/groups/batch     批量写回结果
```

心跳不连续（超过 `expectedIntervalSeconds + 300` 秒无心跳）时，ElyHub 会将该平台所有 QQ 群的展示状态降级为 `UNKNOWN`。

---

## API 端点

所有端点的 Base URL 为 ElyHub 的部署地址，例如 `https://elyhub.example.com`。

---

### `POST /api/worker/heartbeat`

Worker 启动时及每次循环时调用，上报存活状态与能力声明。ElyHub 以此判断 Worker 是否在线，并锁定对应字段禁止管理员手动编辑。

**请求体：**

```json
{
  "capabilities": ["status", "name", "avatar_url", "join_link"],
  "expectedIntervalSeconds": 60
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `capabilities` | `string[]` | 否 | Worker 能写入的字段列表，默认为空 |
| `expectedIntervalSeconds` | `integer` | 否 | 预期心跳间隔（秒），默认 60，用于计算在线状态和 expireAt 宽限期 |

**capabilities 取值：**

| 值 | 对应字段 | 说明 |
|----|---------|------|
| `"status"` | `status` | 能判断群是否可加入 |
| `"name"` | `name` | 能获取群的实际名称 |
| `"avatar_url"` | `avatarUrl` | 能获取群头像 URL |
| `"join_link"` | `joinLink` | 能获取或刷新加群链接 |

声明的 capabilities 会显示在管理后台 Dashboard，并使对应字段在编辑群时变为只读（若该群已启用 Worker）。

**响应：**

```json
{ "ok": true }
```

---

### `GET /api/worker/config`

查询该平台的全局启用状态。Worker 应在启动时和每次循环开始时调用，`enabled=false` 时停止同步操作。

**响应：**

```json
{
  "platform": "qq",
  "enabled": true
}
```

---

### `GET /api/worker/groups?platform={platform}`

获取该平台下所有群聊的完整信息。

**Query 参数：**

| 参数 | 说明 |
|------|------|
| `platform` | 必须与认证 Token 对应的平台一致 |

**响应：**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "platform": "qq",
      "alias": "技术交流群",
      "name": null,
      "qqNumber": "123456789",
      "joinLink": null,
      "adminQq": "987654321",
      "status": "UNKNOWN",
      "expireAt": null,
      "avatarUrl": null,
      "useWorker": null,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

`useWorker` 字段含义：`true` 表示该群明确启用 Worker，`false` 明确禁用，`null` 跟随平台全局开关（即 `enabled` 字段）。Worker 通常只需处理 `useWorker !== false` 的群。

---

### `GET /api/worker/groups/partial?platform={platform}&missing={fields}`

获取指定字段为空的群，用于启动后的初始信息填充。比获取全部群再过滤更高效。

**Query 参数：**

| 参数 | 说明 |
|------|------|
| `platform` | 同上 |
| `missing` | 逗号分隔的字段名，可选值：`status,name,avatar_url,join_link` |

**示例：** 获取缺少名称或头像的群

```
GET /api/worker/groups/partial?platform=qq&missing=name,avatar_url
```

**响应格式同** `GET /api/worker/groups`。

---

### `PATCH /api/worker/groups/{id}`

更新单个群的信息。只需传入要更新的字段，未传字段不受影响。

**路径参数：** `id` 为群的 UUID。

**请求体（所有字段均可选）：**

```json
{
  "status": "ACTIVE",
  "name": "技术交流群",
  "avatarUrl": "https://example.com/avatar.jpg",
  "joinLink": "https://qm.qq.com/cgi-bin/qm/qr?k=xxx",
  "expireAt": "2025-06-01T12:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `"ACTIVE" \| "INVALID" \| "UNKNOWN"` | 群的当前状态，见下方状态机 |
| `name` | `string \| null` | 群实际名称 |
| `avatarUrl` | `string \| null` | 头像 URL |
| `joinLink` | `string \| null` | 加群链接 |
| `expireAt` | `string (ISO 8601) \| null` | 状态有效期截止时间，见下方说明 |

**响应：**

```json
{ "data": { /* 更新后的群完整对象 */ } }
```

若 `id` 不存在或不属于该平台，返回 `404`。

---

### `POST /api/worker/groups/batch`

批量更新，在单个数据库事务中执行，最多 100 条。格式是单条更新的数组形式，每条加上 `id` 字段。**推荐优先使用此接口而非循环调用单条接口。**

**请求体：**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ACTIVE",
    "expireAt": "2025-06-01T12:00:00Z"
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "status": "INVALID"
  }
]
```

**响应：**

```json
{
  "ok": true,
  "updated": ["550e8400-e29b-41d4-a716-446655440000"],
  "notFound": ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
}
```

`notFound` 中的 ID 表示该群不存在或不属于该平台，不影响其他条目的更新。

---

## 状态机与 `expireAt` 语义

### QQ 平台 — 心跳模式

Worker 主动确认群存活，ElyHub 通过 `expireAt` 判断信息是否新鲜。

**Worker 每次更新群时，应将 `expireAt` 设为：**

```
expireAt = 当前时间 + expectedIntervalSeconds + 300 秒（5 分钟宽限）
```

若 Worker 停止心跳，`expireAt` 会自然过期，ElyHub 自动将展示状态降级为 `UNKNOWN`（无论数据库中存储的 `status` 是什么）。

| Worker 上报的 `status` | `expireAt` 是否有效 | 公开页展示状态 |
|----------------------|-------------------|-------------|
| `ACTIVE` | ✅ 未过期 | 🟢 ACTIVE |
| `ACTIVE` | ❌ 已过期 | 🟡 UNKNOWN |
| `INVALID` | 任意 | 🔴 INVALID |
| `UNKNOWN` | 任意 | 🟡 UNKNOWN |

### 微信平台 — 绝对过期模式

微信群通过二维码加群，链接有固定有效期。管理员在后台录入二维码的物理过期时间后，ElyHub 会在过期后自动将状态降级为 `INVALID`。

微信 Worker（如果存在）**通常不需要管理 `expireAt`**——该值由管理员填写。Worker 可以上报 `status` 变化（例如检测到群链接已失效），但不应覆盖管理员设置的 `expireAt`。

---

## 字段写入权限

Worker 只能写入以下字段（通过 PATCH / batch 接口）：

| 字段 | 需要声明 capability |
|------|--------------------|
| `status` | `"status"` |
| `name` | `"name"` |
| `avatarUrl` | `"avatar_url"` |
| `joinLink` | `"join_link"` |
| `expireAt` | 无需声明 |

以下字段由管理员管理，Worker **无法修改**：

`alias`、`qqNumber`、`adminQq`、`platform`、`useWorker`

---

## 参考实现（伪代码）

以下为 QQ Worker 的最小可行实现逻辑，不依赖任何具体语言或框架：

```python
BASE_URL = "https://elyhub.example.com"
HEADERS = {
    "Authorization": "Bearer <QQ_WORKER_SECRET>",
    "X-Worker-Platform": "qq",
    "Content-Type": "application/json",
}
INTERVAL = 60  # 秒，与 expectedIntervalSeconds 保持一致


def heartbeat():
    post("/api/worker/heartbeat", {
        "capabilities": ["status", "name", "avatar_url"],
        "expectedIntervalSeconds": INTERVAL,
    })


def main():
    # 1. 检查是否启用
    config = get("/api/worker/config")
    if not config["enabled"]:
        print("未启用，退出")
        return

    # 2. 注册心跳
    heartbeat()

    # 3. 初始填充缺失信息
    partial = get("/api/worker/groups/partial?platform=qq&missing=name,avatar_url")
    for group in partial["data"]:
        info = fetch_qq_group_info(group["qqNumber"])  # 你的实现
        if info:
            patch(f"/api/worker/groups/{group['id']}", {
                "name": info.name,
                "avatarUrl": info.avatar_url,
            })

    # 4. 主循环
    while True:
        groups = get("/api/worker/groups?platform=qq")["data"]

        updates = []
        now = unix_timestamp()
        for group in groups:
            if group["useWorker"] == False:
                continue  # 该群明确禁用 Worker，跳过

            info = fetch_qq_group_info(group["qqNumber"])
            updates.append({
                "id": group["id"],
                "status": "ACTIVE" if info else "INVALID",
                "name": info.name if info else None,
                "avatarUrl": info.avatar_url if info else None,
                # expireAt = 当前时间 + 间隔 + 5 分钟宽限
                "expireAt": iso8601(now + INTERVAL + 300),
            })

        # 批量写回（最多 100 条，超出自行分批）
        for chunk in chunks(updates, 100):
            post("/api/worker/groups/batch", chunk)

        heartbeat()
        sleep(INTERVAL)
```
