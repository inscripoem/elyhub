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
心跳进程（常驻）：
│
├─ 1. GET /api/worker/config
│      enabled=false → 跳过心跳，等待后重试
│
└─ 循环（每 expectedIntervalSeconds 秒）：
       └─ POST /api/worker/heartbeat        保活 + 声明 capabilities

群同步任务（由 cron 触发）：
│
├─ 1. GET /api/worker/config
│      enabled=false → 退出，不执行同步
│
├─ 2. GET /api/worker/groups/partial?missing=name,avatar_url,...
│      初始填充：补全从未同步过的群信息
│
└─ 3. 扫描各群，判断状态
       └─ POST /api/worker/groups/batch     批量写回（含 expireAt = 下次 cron 时间）
```

心跳不连续（超过 `expectedIntervalSeconds + 300` 秒无心跳）时，ElyHub 会将该平台 Worker 标记为离线。群数据的新鲜度由 `expireAt` 独立控制：若群同步任务停止运行，`expireAt` 到期后该群展示状态自动降级为 `UNKNOWN`。

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
| `"expire_at"` | `expireAt` | 能获取或更新群状态的过期时间 |

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

### `status` 字段语义

Worker 上报的 `status` 表达的是 Worker **主动判断的结论**：

| 值 | 含义 |
|----|------|
| `ACTIVE` | Worker 确认群当前可加入 |
| `INVALID` | Worker 确认群当前不可加入（链接失效、群已解散等） |
| `UNKNOWN` | Worker 无法判断当前状态（查询失败、结果不确定等） |

`UNKNOWN` 是一个合法的主动上报值，表示"我查过了，但不确定"，有别于"我还没查"或"我的数据已经过期"。ElyHub 也会在读取时根据 `expireAt` **推导出** `UNKNOWN`（见下方各平台说明），推导结果与数据库存储的 `status` 无关。

> **重要：** 数据库中的 `status` 字段始终存储 **Worker 最后一次上报的值**，不随时间自动变化。ElyHub 公开页和管理后台展示的是经过 `expireAt` 推导后的**展示态**，两者可能不同。直接查询数据库或通过 Worker API 读取的 `status` 均为原始上报值，不代表当前实际展示状态。

### QQ 平台 — 心跳模式

Worker 通过定期同步群数据并设置 `expireAt` 来表达"此数据在有效期内"。`expireAt` 表示本���同步结果的有效截止时间，与心跳间隔（`expectedIntervalSeconds`）相互独立——心跳用于判断 Worker 是否在线，`expireAt` 用于判断群数据是否新鲜。

**Worker 每次同步群数据时，应将 `expireAt` 设为下次预计同步的时间加上适当宽限期：**

```
expireAt = 当前时间 + 本次到下次同步的预计间隔 + 宽限期
```

若 Worker 停止同步某个群的数据，`expireAt` 会自然过期，ElyHub 自动将该群的展示状态降级为 `UNKNOWN`（无论数据库中存储的 `status` 是什么）。

| Worker 上报的 `status` | `expireAt` 是否有效 | 公开页展示状态 |
|----------------------|-------------------|-------------|
| `ACTIVE` | ✅ 未过期 | 🟢 ACTIVE |
| `ACTIVE` | ❌ 已过期 | 🟡 UNKNOWN |
| `INVALID` | 任意 | 🔴 INVALID |
| `UNKNOWN` | 任意 | 🟡 UNKNOWN |

### 微信平台 — 绝对过期模式

微信群通过二维码加群，链接有固定有效期。`expireAt` 表示二维码的物理过期时间——到期后 ElyHub 自动将展示状态降级为 `INVALID`，无论数据库中存储的 `status` 是什么。

`expireAt` 的来源可以是管理员手动录入，也可以由微信 Worker 解析上报。Worker 能写入的所有字段（见下方"字段写入权限"）均可在任何时候通过 PATCH / batch 接口提交，包括 `expireAt`。

**典型场景：二维码上传型 Worker**

用户将加群二维码图片上传给 Worker，Worker 识别二维码后提取：

- `name`：群名称（二维码通常含群标题）
- `joinLink`：加群链接
- `expireAt`：二维码的物理过期时间

一次性写入 ElyHub，无需管理员逐字段录入。后续若二维码更新，重新上传即可覆盖。

---

## 字段写入权限

Worker 只能写入以下字段（通过 PATCH / batch 接口）：

| 字段 | 需要声明 capability |
|------|--------------------|
| `status` | `"status"` |
| `name` | `"name"` |
| `avatarUrl` | `"avatar_url"` |
| `joinLink` | `"join_link"` |
| `expireAt` | `"expire_at"` |

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
HEARTBEAT_INTERVAL = 60  # 心跳间隔（秒）


def heartbeat():
    post("/api/worker/heartbeat", {
        "capabilities": ["status", "name", "avatar_url", "expire_at"],
        "expectedIntervalSeconds": HEARTBEAT_INTERVAL,
    })


# ── 心跳进程（常驻，每 HEARTBEAT_INTERVAL 秒调用一次）─────────────────
def heartbeat_loop():
    while True:
        config = get("/api/worker/config")
        if config["enabled"]:
            heartbeat()
        sleep(HEARTBEAT_INTERVAL)


# ── 群同步任务（由外部 cron 触发，例如每天凌晨）──────────────────────
def sync_groups(next_run_at: datetime):
    """
    next_run_at: 下次 cron 计划执行时间，用于计算 expireAt
    """
    config = get("/api/worker/config")
    if not config["enabled"]:
        return

    # 初始填充缺失信息（仅处理从未同步过的群）
    partial = get("/api/worker/groups/partial?platform=qq&missing=name,avatar_url")
    for group in partial["data"]:
        info = fetch_qq_group_info(group["qqNumber"])  # 你的实现
        if info:
            patch(f"/api/worker/groups/{group['id']}", {
                "name": info.name,
                "avatarUrl": info.avatar_url,
            })

    # 全量同步状态
    groups = get("/api/worker/groups?platform=qq")["data"]
    updates = []
    for group in groups:
        if group["useWorker"] == False:
            continue  # 该群明确禁用 Worker，跳过

        info = fetch_qq_group_info(group["qqNumber"])
        updates.append({
            "id": group["id"],
            "status": "ACTIVE" if info else "INVALID",
            "name": info.name if info else None,
            "avatarUrl": info.avatar_url if info else None,
            # expireAt 设为下次同步时间，届时若未更新则自动降级为 UNKNOWN
            "expireAt": next_run_at.isoformat(),
        })

    # 批量写回（最多 100 条，超出自行分批）
    for chunk in chunks(updates, 100):
        post("/api/worker/groups/batch", chunk)
```

以下为微信二维码上传型 Worker 的最小可行实现逻辑：

```python
BASE_URL = "https://elyhub.example.com"
HEADERS = {
    "Authorization": "Bearer <WECHAT_WORKER_SECRET>",
    "X-Worker-Platform": "wechat",
    "Content-Type": "application/json",
}


def heartbeat():
    post("/api/worker/heartbeat", {
        "capabilities": ["name", "join_link", "expire_at"],
        # 微信 Worker 无需定期轮询，心跳间隔可设较大值
        "expectedIntervalSeconds": 3600,
    })


def handle_qr_upload(group_id: str, image: bytes):
    """用户上传二维码图片时调用"""
    qr = parse_qr_code(image)  # 你的二维码解析实现
    patch(f"/api/worker/groups/{group_id}", {
        "name": qr.group_name,
        "joinLink": qr.join_url,
        "expireAt": qr.expire_at.isoformat(),  # 二维码物理过期时间
        "status": "ACTIVE",
    })


def main():
    config = get("/api/worker/config")
    if not config["enabled"]:
        return

    heartbeat()

    # 微信 Worker 为被动触发型，主循环仅维持心跳
    while True:
        heartbeat()
        sleep(3600)
        # 二维码上传通过 handle_qr_upload() 独立处理
```
