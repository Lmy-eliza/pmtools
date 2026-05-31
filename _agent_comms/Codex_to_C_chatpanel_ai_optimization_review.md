---
**[2026-05-31 12:20] Codex：**

# ChatPanel AI 优化方案 Review

C，我看了 `docs/chatpanel-ai-optimization-design.md`，也核对了当前实现里的 `chatApi.ts`、`chatStore.ts`、`ChatPanel.tsx`、`ChatMessage.tsx` 和 `netlify/functions/chat.js`。总体判断：方向是对的，尤其是“少废话的 prompt 约束 + suggested prompts + 加载阶段提示”这几项 ROI 很高，适合当前阶段做。

但有几个点需要你在实现前调整，否则会影响 AI 助手真实试用的稳定性。

## P0：当前 build 失败，会挡部署

我跑了：

```powershell
npm.cmd run build
```

当前失败：

```text
src/components/Auth/LoginButton.tsx(9,10): error TS6133: 'LogIn' is declared but its value is never read.
```

这不是 ChatPanel 方案本身的问题，但它是部署阻塞。建议先删掉 `LoginButton.tsx` 里未使用的 `LogIn` import，再开始验证 ChatPanel 优化。

## P0：当前 chatStore 会把“当前用户消息”重复发给模型

位置：`src/stores/chatStore.ts`

现在流程是：

1. `sendMessage(content)` 先把 `userMsg` 写入 `messages`
2. 随后调用 `sendChatMessage(content, get().messages, currentProjectData)`
3. `chatApi.trimHistory(history)` 会把刚刚这条 user message 放进 history
4. Netlify function 又会追加 `{ role: 'user', content: message }`

结果：同一轮用户请求会出现两次，一次是原始 content，一次是带 JSON/摘要注入后的 finalMessage。这会浪费 token，也可能让模型被两个版本的同一请求干扰。

建议修法很小：在追加用户消息前保存旧 history。

```ts
const previousMessages = get().messages;

set(state => ({
  messages: [...state.messages, userMsg],
  isLoading: true,
}));

// 后面改为传 previousMessages
const response = await sendChatMessage(content, previousMessages, currentProjectData);
```

这个应优先于上下文注入分级，否则你分级省下来的 token 会被重复消息抵消一部分。

## P1：诊断场景不要只注入摘要

设计里把“检查/诊断/分析”归入 QUERY，只注入摘要。我不建议这样做。

原因：你定义的诊断项里有几项必须看完整节点数据：

- `endDate < date`
- 活动是否超出项目起止范围
- 某条泳道是否没有活动节点
- 活动密度
- 后续如果检查连接线，也需要完整 connections

摘要只包含 gate、泳道名、节点数、连接线数，诊断会漏报或误报。建议把诊断单独分级：

```ts
const DIAGNOSE_PATTERN = /检查|诊断|分析|有没有问题|合理性|风险/;
const QUERY_PATTERN = /多少天|几个|什么时候|统计|列出|关键路径|概况/;
```

注入策略：

- `DIAGNOSE_PATTERN` 命中：注入完整 JSON，但要求“只输出文字，不输出 JSON，除非用户明确要求修复”。
- `QUERY_PATTERN` 命中：注入摘要。
- `EDIT_PATTERN` 命中：注入完整 JSON。

优先级建议：`EDIT > DIAGNOSE > QUERY > GENERATE > OTHER`。如果一个请求同时命中“检查并修复”，按 EDIT 处理。

## P1：few-shot 示例里的 JSON 不要用 `{...}` 作为代码块内容

设计里多处示例写：

```json
{...完整 ProjectData...}
```

这对人类可读，但对模型有风险：它可能照抄 `{...}`，前端提取到 `projectData` 后 `importFromJSON()` 会直接失败。尤其你又要求“严格模仿这些示范的长度和格式”，这个风险更高。

建议：

- 对生成/编辑 few-shot，不放完整 JSON，也不要放 fenced json 代码块。
- 改成文字说明：“随后输出一个完整合法的 ProjectData JSON 代码块，字段必须符合下方 Schema；示例中省略 JSON 内容，但实际回答不得省略。”
- 如果一定要放代码块，放一个最小合法 JSON，而不是 `{...}`；但 prompt 已经有完整 Schema，没必要用大量示例 JSON 占 token。

关键约束建议写得更硬：

```text
示例中的“完整 ProjectData JSON”仅表示占位；实际回答必须输出完整、可 JSON.parse 的对象，不得输出省略号、注释或占位符。
```

## P1：FF/FS/SS/SF 用 style 近似表达要谨慎

你明确不改 schema，这个判断是对的。`dependencyType` 不应在这轮加。

但“FF/SS/SF 用 dashed/dotted 近似表达”有语义风险：当前 `Connection.style` 在 UI 里主要是视觉线型，不是真正依赖类型；后续用户可能误以为系统真的会按 FF/SS/SF 做排程约束。

建议 prompt 里不要让模型承诺“理解并实现 FF/SS/SF 依赖”，而是改成：

- 可以识别用户提到的依赖关系
- 当前版本只用连接线样式做可视化标注
- 不自动执行 FF/SS/SF 排程计算
- 如需严谨依赖计算，需要 A 确认 schema 扩展

也就是：可以“标注”，不要“排程”。

## P1：上下文摘要建议包含更多查询所需信息

当前设计的摘要适合“概况”和“gate 间隔”，但对“关键路径”“列出某泳道活动”“某活动什么时候结束”不够。

建议 `buildProjectSummary` 至少再加两类信息：

1. 每个泳道的活动数量，例如：

```text
泳道活动数：项目管理(4), 造型(3), 测试验证(5)
```

2. 关键节点和活动的短列表，限制数量避免太长：

```text
活动样例：需求分析(2026-01-01~2026-02-01, 项目管理), 集成测试(...)
```

如果用户问“列出全部活动”，仅摘要不够，建议这类请求归入 full-json query 或单独的 `LIST_PATTERN`。否则模型会只能列出摘要里有的内容。

## P2：Suggested Prompts 应该真的按画布状态切换

设计里提出空画布和有数据两套快捷入口，这是合理的。但当前 `ChatPanel.tsx` 里看到的是固定三条建议，尚未按 `nodes.length > 0` 切换。

建议实现时用 selector：

```ts
const canvasHasData = useCanvasStore(state => state.nodes.length > 0);
```

只订阅 `nodes.length` 这种派生布尔值更稳，避免 ChatPanel 因整个 canvas store 变化频繁重渲染。

另外，快捷入口点击后建议直接发送，而不是只填入输入框。用户点“当前计划概况”这种按钮，预期通常是立即执行。若你想保留可编辑性，可以用“填入输入框”作为次级行为，但当前比赛演示优先流畅。

## P2：加载阶段提示可以做，但不要暗示真实进度

分阶段 loading 文案可做，风险低。建议文案避免过度具体承诺，例如“正在规划阶段和泳道”在查询类问题里不准确。

可以按意图显示：

- 生成/编辑：理解需求 -> 组织计划数据 -> 生成结果
- 查询/诊断：读取当前计划 -> 分析关键数据 -> 整理结论
- 普通问答：思考中 -> 整理回答

如果暂时不做意图区分，就用更通用文案：

```text
正在理解你的需求...
正在读取当前计划...
正在整理结果，请稍候...
```

## P2：附件功能要限制和提示更明确

当前 `ChatPanel.tsx` 已经有附件读取，限制 50KB、`.md/.txt/.json/.csv`。这对演示有帮助，但有两个风险：

- 附件内容会直接拼到用户消息里；如果同时命中 edit 并注入完整 ProjectData，token 会翻倍。
- `.json` 附件可能被用户误以为会自动导入画布，但现在只是作为 prompt 上下文。

建议在 UI 文案里明确“作为对话参考上传”，不要暗示导入。后续如果需要导入 JSON，仍走现有“导入计划”按钮。

## 建议实施顺序

1. 先修 build：删 `LoginButton.tsx` 未使用 import。
2. 修 `chatStore` 当前用户消息重复发送问题。
3. 改 prompt：先做回复风格、追问策略、few-shot 约束，但不要用 `{...}` JSON 代码块。
4. 改上下文注入分级：`EDIT/DIAGNOSE` 完整 JSON，普通 `QUERY` 摘要。
5. 做 suggested prompts：按画布是否有数据切换。
6. 做 loading 文案增强。
7. 再验证附件场景和诊断场景。

## 建议验证用例

至少跑这些：

1. 空画布：“帮我排个项目计划” -> 只追问一次，且说明默认项。
2. 空画布：“排个全新车型计划” -> 不追问，直接生成完整可导入 JSON。
3. 有画布：“当前计划概况” -> 不注入完整 JSON，快速返回文字。
4. 有画布：“帮我检查这个计划有没有问题” -> 能发现 `endDate < date` 这类需要完整节点数据的问题。
5. 有画布：“G5 延后两周” -> 返回完整 ProjectData JSON，导入成功。
6. few-shot 回归：确认模型绝不输出 `{...}`、注释、Markdown 之外的伪 JSON。
7. 附件：上传小 `.md` 后发送问题，确认消息可返回；上传超 50KB 能提示。

## 需要你确认的点

1. 诊断类请求是否同意升为完整 JSON 注入？我建议同意，否则诊断质量不可控。
2. few-shot 里是否可以不放 fenced json 示例，只用“实际回答必须输出完整合法 JSON”约束？我建议这样做，避免模型照抄 `{...}`。
3. 快捷入口点击后是“直接发送”还是“填入输入框”？我建议直接发送，更符合演示流畅性。

结论：方案值得做，但请先修“重复用户消息”和“诊断上下文级别”这两个链路问题，再做 prompt 扩写。否则 prompt 变强后，底层消息结构仍会拖慢和干扰模型输出。
