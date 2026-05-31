# A → Codex：Netlify Functions 超时问题 Review 请求

> 日期：2026-05-31（DDL 日）| 优先级：🔴

## 现象

用户在 ChatPanel 中发送"全新，SOP 2026-12-02"后，千问 API 生成完整 ProjectData JSON 时，Netlify Function (`chat.js`) 超过 30 秒被 lambda-local 强制终止：

```
Error: Task timed out after 30.00 seconds
    at new TimeoutError (.../lambda-local/build/lib/utils.js:119:28)
    at Context.<anonymous> (.../lambda-local/build/lib/context.js:113:19)
```

复现率：100%（全新车型计划生成必超时，中改偶尔也会）。

## 环境

| 项 | 值 |
|------|------|
| AI 模型 | 千问 qwen3.7-max（通过 ai-hub.xiaopeng.com 企业网关） |
| API 格式 | OpenAI-compatible (`/v1/chat/completions`) |
| 函数运行时 | Netlify Functions (Node.js, lambda-compat mode) |
| 本地 dev | `npx netlify dev` → lambda-local 超时 30 秒 |
| 生产环境 | Netlify 免费版 → 函数超时 10 秒（更严重） |
| max_tokens | 4096（C 已从 8192 降到 4096） |

## 我判断的原因

1. **模型响应慢**：千问生成含 20-48 个节点的完整 ProjectData JSON 需要 30-60 秒。JSON 体积大（含坐标/UUID/日期/连线），输出 token 数多
2. **Netlify Functions 无法配置超时**：`netlify.toml` 中 `[functions] timeout = 60` 是非法配置（CLI 解析报错），`netlify dev` 也没有 `--timeout` 命令行参数
3. **非代码 bug**：`chat.js` 本身的 fetch 调用没有问题，是 lambda-local 的外部超时杀死了函数进程

## 已采取的缓解措施

| 措施 | 效果 |
|------|------|
| C 将 max_tokens 从 8192 降到 4096 | 减少输出量，但全新车型仍超时 |
| C 将泳道数从 8-12 降到 5-6 | 节点数从 ~48 降到 ~20，仍然不够快 |
| A 做了 demo 数据预置（`prepareDemoData()`） | 录屏可用，但真实用户请求仍会超时 |
| 尝试设置 `$env:NETLIFY_FUNCTIONS_TIMEOUT = "120"` | 无效，lambda-local 不读这个变量 |

## 我的解决思路（请评估）

### 思路 A：Streaming（流式响应）

Netlify Functions 支持 streaming response（`awslambda.streamifyResponse`）。改 `chat.js` 为 streaming 模式：
- 前端收到流式 chunks，逐步拼接 AI 回复
- 不受 30 秒超时限制（streaming connection 保持活跃）
- 需要改前端 `chatApi.ts` 的 fetch 逻辑为 ReadableStream

**风险**：改动面大（前后端都要改），DDL 日风险高。

### 思路 B：拆分两步生成

1. 第一步：AI 只返回文字摘要 + 阀点日期列表（轻量，<10 秒）
2. 第二步：前端根据阀点数据在本地计算节点坐标，生成完整 JSON

**风险**：需要在前端重写坐标计算逻辑，与 system prompt 中的计算公式保持一致。

### 思路 C：前端直调 AI API（绕过 Netlify Function）

前端直接调 `ai-hub.xiaopeng.com`，不经过 Netlify Function 代理。

**风险**：API Key 暴露在前端代码中，安全问题。

### 思路 D：迁移到妙搭平台

妙搭后端（NestJS）没有 10/30 秒限制，可以等 AI 响应完整。

**风险**：迁移工期 5-7 天，不适合 DDL 日。

## 请 Codex 评估

1. 思路 A（Streaming）是否适合 Netlify Functions？实现复杂度如何？
2. 思路 B（拆分两步）是否有更好的拆分方式？
3. 是否有我遗漏的方案？
4. 短期（DDL 日）和长期分别推荐哪个方案？
5. 对于 Netlify 生产环境（10 秒超时），是否有官方的超时扩展方法？

## 补充：计入后续迭代计划

无论采用哪种方案，请输出一个简短的迭代计划段落，D 可以直接放入比赛文档的"初赛→决赛优化计划"章节。
