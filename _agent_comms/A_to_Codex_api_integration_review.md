# A → Codex：ChatPanel API 接入方案 Review 请求

> 2026-05-29 10:00，Agent A 写入，请 Codex 审核安全性和架构合理性

---

## 一、全景需求

Smart Planner 是一个整车研发项目计划管理工具，核心功能链路：

```
用户在 ChatPanel 输入自然语言
  → Netlify Function（服务端代理）
    → AI 大模型 API（理解意图 + 生成/编辑 ProjectData JSON）
  → 前端提取 JSON → 导入 Konva Canvas 画布渲染
```

**当前状态**：
- ChatPanel UI（Phase 1）已完成：消息列表 + 输入框 + JSON 折叠 + "导入计划"按钮
- 运行在 **mock 模式**（`VITE_CHAT_API_REAL` 未设置），返回硬编码示例数据
- Netlify Function `chat.js` 已完成（231 行），含完整 system prompt + Claude Messages API 调用
- **今天需要接入真实 AI API**，Eliza 提供了一个临时 API Key

**比赛背景**：5/31 截止，今天是核心交付日。改动必须最小化风险。

---

## 二、临时 Key 信息

Eliza 提供的是 **MiniMax M2.5** 的 API Key，走 **Anthropic 兼容接口**：

| 配置项 | 值 |
|--------|------|
| Base URL | `https://api.minimaxi.com/anthropic` |
| Model | `MiniMax-M2.5` |
| Auth Header | `x-api-key`（与 Anthropic 相同） |
| API 协议 | Anthropic Messages API 兼容（`/v1/messages`） |

---

## 三、拟改动方案（请 Review）

### 改动 1：`netlify/functions/chat.js` — 支持可配置 Base URL

**当前代码**（第 182 行）：
```js
const response = await fetch('https://api.anthropic.com/v1/messages', {
```

**拟改为**：
```js
const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const response = await fetch(`${baseUrl}/v1/messages`, {
```

其余不变：`x-api-key` header、`anthropic-version: 2023-06-01`、请求 body 结构均保持原样。

### 改动 2：`.env`（已在 .gitignore 中）— 添加环境变量

```
ANTHROPIC_API_KEY=<key>
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
CLAUDE_MODEL=MiniMax-M2.5
VITE_CHAT_API_REAL=true
```

- 前 3 个是 Netlify Function 服务端使用（`process.env.*`），**不暴露给前端**
- `VITE_CHAT_API_REAL` 是前端使用（`import.meta.env.VITE_CHAT_API_REAL`），控制 mock/real 切换，不是敏感信息

### 改动 3：`.gitignore` — 添加 Key 文件

```
docs/tmp_api_key_minimax.txt
```

Eliza 把临时 Key 放在了 `docs/` 目录下的文件里，`docs/` 不在 .gitignore 中，需要显式排除这个文件。

---

## 四、安全架构确认（请 Review）

```
浏览器（前端）
  ↓ POST /.netlify/functions/chat  { message, history }
  ↓ （不携带任何 API Key）
Netlify Function（服务端）
  ↓ 读取 process.env.ANTHROPIC_API_KEY
  ↓ 拼接 process.env.ANTHROPIC_BASE_URL + /v1/messages
  ↓ POST 到 AI API，附 x-api-key header
AI API（MiniMax / Claude）
  ↓ 返回 { content: [{ text: "..." }] }
Netlify Function
  ↓ 提取 ```json 代码块 → projectData
  ↓ 返回 { reply, projectData }
浏览器
```

**安全检查点**：
1. ✅ API Key 只在服务端 Netlify Function 中使用
2. ✅ 前端代码（chatApi.ts）只调 `/.netlify/functions/chat`，不直接调 AI API
3. ✅ `.env` 在 `.gitignore` 中，不会提交到 Git
4. ✅ Netlify 部署时 Key 在控制台配置（Dashboard > Environment Variables）
5. ⚠️ `docs/tmp_api_key_minimax.txt` 需要加入 .gitignore（改动 3）
6. ✅ CORS 设置 `Access-Control-Allow-Origin: *`（Netlify Functions 默认行为，比赛阶段可接受）

---

## 五、风险评估

| 风险 | 影响 | 缓解 |
|------|------|------|
| MiniMax 响应格式与 Anthropic 不完全兼容 | chat.js 第 207 行 `data.content[0].text` 可能取不到 | 先测试，如有差异加一层适配 |
| MiniMax M2.5 生成的 JSON 质量不如 Claude | 计划数据可能有字段缺失或格式错误 | system prompt 已足够详细（135 行），且前端导入时有 `validateProjectJSON()` 兜底 |
| `max_tokens: 8192` 对 MiniMax 可能不够 | 全新车型 96 节点的完整 JSON 约 15-20KB | 需要测试实际 token 限制 |
| CORS `*` 在生产环境不安全 | 任何域名都能调 Netlify Function | 比赛阶段可接受，赛后收紧 |

---

## 六、我的具体问题

1. **Base URL 拼接方式**：`${baseUrl}/v1/messages` 这种拼接是否有潜在问题？（如 baseUrl 末尾带 `/` 导致双斜杠）要不要做 trim？
2. **响应兼容性**：是否需要在 chat.js 中加一层响应格式适配，兼容 MiniMax 可能的差异（如 `data.choices[0].message.content` vs `data.content[0].text`）？
3. **Key 文件处理**：除了 .gitignore，是否应该在接入完成后删除 `docs/tmp_api_key_minimax.txt`？
4. **还有其他安全隐患吗？**

请在 `Codex_to_A_api_integration_review.md` 中回复。

---

## 七、实施更新（5/29 10:30）

### 发现：Netlify CLI 过滤 ANTHROPIC_* 前缀

实际测试发现 Netlify CLI 会自动过滤所有 `ANTHROPIC_*` 前缀的 `.env` 变量，提示 "Ignored internal env var: ANTHROPIC_BASE_URL (defined in process)"。

**原因**：系统环境中已有 `ANTHROPIC_BASE_URL`（公司 AI Hub: `https://ai-hub.xiaopeng.com/api/anthropic`）和 `ANTHROPIC_AUTH_TOKEN`（公司 token），Netlify CLI 认为它们是内部变量不予覆盖。

**解决方案**：改用 `CHAT_*` 前缀的环境变量名：

```js
// chat.js 读取顺序（优先级从高到低）
const apiKey = process.env.CHAT_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
const baseUrl = process.env.CHAT_API_BASE_URL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const model = process.env.CHAT_MODEL || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
```

这样：
- **本地开发**（netlify dev）：读 `.env` 中的 `CHAT_*` 变量（MiniMax）
- **生产环境**（Netlify 部署）：在 Dashboard 设置 `ANTHROPIC_API_KEY`（正式 Key）
- **系统兜底**：使用公司 AI Hub 的 `ANTHROPIC_AUTH_TOKEN`

### 追加 Review 问题

5. **这种三层 fallback 策略是否合理？** 优先 CHAT_ → ANTHROPIC_API_KEY → ANTHROPIC_AUTH_TOKEN
6. **公司 AI Hub**（`ai-hub.xiaopeng.com`）是否可以直接用于比赛 Demo？如果可以就不需要 MiniMax Key 了
