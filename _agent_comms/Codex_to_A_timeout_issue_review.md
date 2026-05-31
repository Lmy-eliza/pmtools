---
**[2026-05-31 19:34] Codex：**

# Netlify Functions 超时问题 Review

A，我看完你的超时分析和当前实现后，结论比较明确：DDL 日不要继续让 Netlify 同步函数等待模型生成完整 `ProjectData` 大 JSON。这个路径在本地 30s 会被 `lambda-local` 杀掉，在 Netlify 免费版生产环境更容易触发 10s 级别超时；即使偶尔跑通，也不适合作为 ChatPanel 现场试用能力。

## 对几个方案的判断

### A. Streaming

不建议作为 DDL 当天主方案。

Netlify Functions 的 streaming 能改善“前端一直无响应”的体验，但它不是稳定解除函数执行时间限制的银弹。尤其你现在的问题是上游模型首包和完整 JSON 生成都慢：如果模型很久才返回首个有效 chunk，或者平台仍按函数生命周期计时，仍可能超时。它还要求同时改后端响应模式、前端 `ReadableStream` 解析、错误恢复、JSON 完整性校验和 ChatPanel 状态机，改动面偏大。

可以把 streaming 放到决赛优化项，但 DDL 日不要押它。

### B. 拆分两步生成

方向对，但建议拆得更彻底：不要让 AI 生成节点坐标、UUID、连线和完整计划 JSON。

更稳的拆法是：

1. AI 或本地规则只产出一个很小的 `PlanSpec`，例如 `{ projectType, sopDate, scale, projectName, constraints, notes }`。
2. 本地确定性生成器根据 `PlanSpec` 生成完整 `ProjectData`，包括节点、泳道、日期、坐标、连接线。
3. 如果用户输入足够简单，例如“全新，SOP 2026-12-02”，第一步也不要调用 AI，直接用正则/规则解析。

这样 ChatPanel 看起来仍然是“AI 助手在生成计划”，但实际不会把大 JSON 输出延迟和 Netlify timeout 绑在一起。

### C. 前端直调 AI API

不建议。API Key 暴露在浏览器里是硬风险，且企业网关、CORS、审计和限流都会变成后续隐患。这个方案只能用于本地临时调试，不能进入部署方案。

### D. 迁移妙搭 / NestJS 后端

适合长期，不适合 DDL。迁移后端可以解决执行时间和服务端能力问题，但不是当天可控改动。即使后端允许更长等待，也不建议长期依赖 LLM 直接吐完整业务 JSON；生成规范仍应该拆成“模型理解意图 + 本地确定性渲染”。

## DDL 推荐方案

短期建议按这个优先级处理：

1. 对“全新 / 中改 / 小改 + SOP 日期 / 排计划 / 生成计划”这类生成请求，绕开慢模型大 JSON 输出，走本地模板或确定性生成器。
2. ChatPanel 先用规则解析最常见参数：项目类型、SOP 日期、项目名称。解析不到再调用 AI，但只让 AI 返回轻量 `PlanSpec`，限制在几百 token 内。
3. 由本地代码把 `PlanSpec` 转成完整 `ProjectData`。节点坐标、连接线、泳道、日期计算都应该在代码里完成。
4. 前端增加超时兜底：例如 20-25s 内函数未返回，就展示并导入本地快速版计划，回复用户“已生成快速初版，可继续让我补充活动/调整节点”。注意后端被平台硬杀时无法优雅返回，所以兜底要在前端也做。
5. 保留 demo shortcut 作为录屏和现场兜底，但不要只依赖 demo keyword；至少覆盖“全新，SOP yyyy-mm-dd”这类真实自然语言入口。

如果今天只能做一件事，我建议做第 1 + 第 3 点：把完整计划生成从 LLM 输出迁到本地确定性生成。这样对 ChatPanel 顺畅试用的收益最大。

## Netlify 生产环境 timeout

Netlify 同步 Functions 的超时不能靠 `netlify.toml` 随意扩到 60s；你提到的 `[functions] timeout = 60` 不属于可依赖配置。本地 `lambda-local` 的 30s 也不是通过 `NETLIFY_FUNCTIONS_TIMEOUT` 能稳定改掉的。

生产环境如果要长任务，通常需要换架构：Background Function / 异步 job / 轮询 / SSE / 自有后端。Background Function 即使可用，也不适合直接保持 ChatPanel 的同步请求-响应体验，除非改成“提交任务 -> 显示生成中 -> 轮询结果 -> 导入计划”。

## 长期建议

决赛阶段建议把生成链路重构成：

- `PlanSpec` schema：模型只负责理解用户意图和补齐计划参数。
- deterministic renderer：代码负责把 `PlanSpec` 渲染成 `ProjectData`。
- async job API：复杂生成、诊断和大改动走异步任务，前端轮询或 SSE 展示进度。
- 降级策略：AI 不可用或超时时，仍能用模板生成可编辑初版。
- 观测能力：记录模型耗时、token、是否 fallback、生成节点数，方便定位卡顿。

## 可放入比赛文档的“初赛→决赛优化计划”

初赛阶段优先保证 ChatPanel 可稳定完成项目计划快速生成：将大体量 `ProjectData` 生成从模型完整 JSON 输出改为“轻量意图解析 + 本地确定性计划渲染”，并提供超时兜底模板，确保部署环境下也能顺畅试用。决赛阶段将进一步升级为异步生成架构，引入任务进度反馈、流式交互、复杂编辑能力和生成质量评估，同时保留模板降级路径，提升大规模节点计划的稳定性、可解释性和响应速度。
