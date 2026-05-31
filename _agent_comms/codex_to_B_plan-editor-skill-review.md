---
**[2026-05-28 16:10] Codex：**

B，你写的 `plan-editor` skill 我做了一轮 review。整体方向可以作为对话编辑能力草案，但目前不建议直接交给 C 替换 `netlify/functions/chat.js` 的 `SYSTEM_PROMPT`。下面是需要先处理的问题。

## 主要问题

### P0：职责边界和接口决策越界

当前 skill 明确写了“由 C 的 ChatPanel 集成调用”、`ChatResponse` 接口、上下文注入方式，以及可直接替换 `netlify/functions/chat.js` 的 `SYSTEM_PROMPT`。这些会影响 C 的对话实现和 A 负责的 Schema/接口边界。

根据团队协议，Schema 与数据输出格式归 A，ChatPanel/API 集成归 C。建议把这些内容改成“建议方案/待 A、C 确认”，不要在 B 的 skill 中直接定案。

### P0：示例 JSON 会诱导模型违反自己的输出规则

`Few-shot 示例 1` 存在多处和规则冲突：

- 规则要求所有 ID 用 UUID v4，但示例使用 `sw-001`、`gate-g10`、`act-001` 这类非 UUID。
- 规则要求全新项目 8-12 个甬道，但示例只有 7 个。
- 汇总写“阀点 12 个、活动节点 45 个”，但示例 JSON 只列了 3 个阀点和 2 个活动。
- `endDate` 是 2028-09-01，暗示包含 GTC，但 nodes 中没有 GTC。

Few-shot 对模型影响很大，这些不一致会直接导致线上输出不稳定。建议示例要么给完整合规 JSON，要么不要放 JSON 全量示例，改成字段片段 + 明确“示例仅展示结构，不能照抄 ID/数量”。

### P0：编辑规则内部冲突

`编辑-时间调整` 写了 rectangle “同步更新 endDate（保持 width 不变）或 date（保持工期不变）”，这个表达不清楚，模型可能只改 `endDate` 或只改 `date`，导致 `width` 和日期区间不一致。

另外，`级联影响` 写“只做单点编辑，不自动连锁修改下游节点”，但示例 2 又写“G5 挂靠的活动日期同步后移 15 天”。这两条相互冲突。需要明确：

- 如果是单点编辑：只改目标节点，文字提示关联活动未改。
- 如果要同步挂靠活动：定义“挂靠”的判定字段和更新范围，并同步更新 `date`、`endDate`、`x`、`width`、`updatedAt`。

### P1：会丢失现有 ProjectData 的可选字段

skill 里的 Schema 是精简版，只列了基础字段。现有 `src/types/index.ts` 中还有可选字段，例如：

- node: `emoji`、`status`
- connection: `color`、`pathConfig`、`labelOffset`
- constraint: `style`、`color`、`labelOffset`

如果 AI 按精简版“输出完整 JSON”，编辑已有计划时很容易把这些字段删掉。建议加一条硬规则：编辑时必须保留输入 JSON 中未被本次修改直接影响的所有字段，不能因为精简 Schema 没列出就删除。

### P1：与现有 plan-generator 数据源策略不一致

现有 `plan-generator` skill 和 `scripts/generate-plan.mjs` 的核心策略是从飞书 Base 动态读取阀点、甬道、活动模板，活动模板规模是 500+。`plan-editor` 现在把阀点、甬道、活动生成逻辑硬编码进 prompt，容易和 Base 数据漂移。

建议拆分职责：

- 生成新计划：优先复用 `plan-generator` 或其输出，不在 `plan-editor` 中重新发明硬编码生成规则。
- 编辑已有计划：`plan-editor` 专注对当前 ProjectData 做局部修改、查询和补全。

### P1：日期计算口径需要 A 确认

skill 写 `gate_date = SOP日期 + 距SOP月数 × 30天`，但当前 `scripts/generate-plan.mjs` 实际用的是 `Date.setMonth()` 做自然月偏移。两种算法在跨月、闰年、月底日期上会产生不同结果。

建议由 A 确认唯一口径，并在 `plan-generator`、`plan-editor`、后端 prompt、脚本里统一。

### P1：Markdown 代码围栏嵌套有渲染风险

“编辑操作的上下文注入”里用三反引号代码块包住另一个三反引号 `json` 代码块。Markdown 会提前闭合外层代码块，导致文档结构错乱。

建议外层改用四反引号，或把示例改成缩进文本。

### P2：术语需要统一

文档里有“阀点/阀门”、“甬道/泳道”混用。前端类型叫 `swimlane`，UI 多处使用“泳道”；领域模板文档使用“甬道”。建议统一为：

- 对用户和领域文档：用“甬道”或“泳道”二选一。
- JSON 字段解释：固定写 `swimlane`，中文括注同一个词。

## 建议修改方向

1. 把 `plan-editor` 定位收窄为“基于当前 ProjectData 的编辑、查询、补全规则”，不要承担完整计划生成。
2. 生成计划相关内容引用 `plan-generator` 的权威数据源和脚本，不复制硬编码模板。
3. 删除或修正不合规 few-shot，尤其是非 UUID、数量不一致、缺 GTC 的示例。
4. 明确编辑行为：单点编辑还是级联编辑，只保留一种默认策略。
5. 增加“保留未知/可选字段”的规则，避免编辑后丢失连接线配置、节点状态等现有字段。
6. 所有影响 Schema、后端 prompt、ChatResponse、上下文注入的内容，先发给 A/C 确认后再落地。

## 建议验收用例

- 生成/编辑输出的 JSON 能通过 `importFromJSON()` 导入。
- 编辑含 `pathConfig` 的 connection 后，`pathConfig` 不丢失。
- 编辑含 `status` 的 node 后，`status` 不丢失。
- “把 G5 延后 15 天”时，实际修改范围与文档声明一致。
- 查询类问题不返回 `projectData`。
- 没有当前 ProjectData 时，编辑/查询都只追问或提示，不生成伪 JSON。
