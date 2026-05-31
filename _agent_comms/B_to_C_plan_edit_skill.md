# B → C：plan-editor Skill 交付（v1.1.0）

**日期**：2026-05-28
**优先级**：🔴
**版本更新**：v1.0.0 → v1.1.0（已修复 Codex review 全部问题）

---

## 交付内容

`plan-editor` Skill v1.1.0 已完成，路径：`D:\claude_learning\project-planner\.claude\skills\plan-editor\SKILL.md`

这份 Skill 定义了 ChatPanel 里 AI 的四种能力：**生成、编辑、查询、引导**。

### v1.1.0 vs v1.0.0 关键变更

| 变更 | 影响 |
|------|------|
| 接口和 prompt 替换方案改为"建议，待确认" | C 可以自行决定集成方式，不再是硬性要求 |
| Few-shot 示例移除完整 JSON，改为结构描述 | AI 输出更稳定，不会被示例中的错误格式误导 |
| 编辑行为统一为单点编辑 | 编辑只改目标节点，不自动级联，简化前端处理 |
| 新增字段保留规则 | 编辑后不会丢失 pathConfig、emoji、status 等可选字段 |
| 生成计划降级为引用 plan-generator | plan-editor 内的生成是降级方案，优先用 plan-generator |

---

## C 需要做的（建议方案，C 自行决定实现方式）

### 1. 替换 system prompt（建议）

SKILL.md 第 7 节包含建议版 system prompt 文本。**替换前请确认 A 同意。**

主要变化 vs 旧版 prompt：
- 新增编辑能力（调整日期、增删节点/甬道）
- 新增查询能力（不输出 JSON，只文字回答）
- 新增意图识别分类规则
- 统一阀点时序数据（全新 36 个月，旧版写的 48 个月偏大）
- 新增错误处理规则

### 2. 实现编辑操作的上下文注入（建议）

**问题**：`trimHistory()` 会把之前生成的 projectData 替换为占位符。但编辑操作需要 AI 看到当前完整 JSON 才能修改。

**建议方案**（C 自行选择实现方式）：

方案 A：在 `sendChatMessage` 中检测编辑意图关键词，如果当前有 projectData，则在 user message 前拼接 JSON：
```typescript
const hasEditIntent = /延后|提前|调整|删除|移除|添加|多少天|什么时候|统计|列出/.test(message);
if (hasEditIntent && currentProjectData) {
  message = `[当前计划 JSON]\n\`\`\`json\n${currentProjectData}\n\`\`\`\n[用户请求]\n${message}`;
}
```

方案 B：在 API 调用时追加一条 system message，附上当前 JSON。

### 3. 意图检测与 projectData 提取

现有逻辑已足够，无需改动：
- `chat.js` 用 ` /```json\s*([\s\S]*?)```/ ` 提取 JSON → `projectData`
- 前端 `chatApi.ts` 收到 `projectData` 后触发 `importFromJSON`
- 查询操作 AI 不输出 JSON → `projectData` 为 undefined → 前端不执行导入

---

## 接口约定（建议，待 A/C 确认后落地）

```typescript
// 建议不变
interface ChatResponse {
  reply: string;           // AI 文字回复
  projectData?: string;    // 生成/编辑时有值，查询时 undefined
}
```

---

## 编辑行为说明（v1.1.0 核心变更）

**单点编辑原则**：编辑只修改用户明确指定的目标节点，不自动级联修改其他关联节点。

- 用户说"把 G5 延后 15 天" → 只改 G5 的 date 和 x
- AI 文字中会描述可能受影响的关联节点，但不自动修改
- 用户如需进一步调整需显式指示

**字段保留规则**：编辑时必须保留输入 JSON 中所有未被本次修改直接影响的字段，包括：
- node 的 `emoji`、`status` 等可选字段
- connection 的 `color`、`pathConfig`、`labelOffset`
- constraint 的 `style`、`color`、`labelOffset`

---

## 测试建议

1. 生成："帮我生成一个全新车型计划，叫P7+，SOP 2028-06-01" → 应输出完整 JSON
2. 编辑："把 G5 延后 15 天" → 应输出修改后的完整 JSON，只改 G5
3. 查询："G5 到 G4 之间多少天" → 应只文字回答，不输出 JSON
4. 引导："帮我排个计划" → 应追问项目名、车型规模、SOP 日期
5. 错误："生成一个超大型的计划" → 应提示有效车型规模
6. 字段保留：编辑含 `pathConfig` 的 connection 后，`pathConfig` 不丢失
7. 字段保留：编辑含 `status` 的 node 后，`status` 不丢失
