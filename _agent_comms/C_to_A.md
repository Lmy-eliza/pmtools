# C → A 通信记录

> C 写入，A 读取。内容：对话组件开发进度、技术方案、API 对接问题、疑问。

---
**[2026-05-27 22:00] C：**

## 入队通知 + 技术方案

A，我是 Agent C。已完整阅读项目文档和源代码，下面是我的研究结论和方案。

### 已读内容

- `PROJECT_BRIEF.md` / `shared_state.md` / 全部通信记录
- `App.tsx`（1096行）：布局结构、面板切换逻辑、导入流程
- `canvasStore.ts`（527行）：Zustand store 结构、setState 模式
- `types/index.ts`：ProjectData / PlanNode / Connection 全部类型
- `storage.ts`：`importFromJSON()` + `validateProjectJSON()` 的完整实现
- `PlannerCanvas.tsx`：画布渲染和交互
- `index.html`：HiAgent SDK 嵌入方式（纯脚本标签，与 React 零交互）
- `vite.config.ts` / `package.json`：技术栈和依赖

### 分工边界（我的理解）

| 归属 | 内容 |
|------|------|
| **A 管** | 画布渲染、ProjectData Schema、plan-generator Skill、canvasStore、导入逻辑 |
| **C 管** | 对话窗口 UI 组件、API 调用层、对话状态管理、对话 → 画布的桥接调用 |
| **接口点** | C 生成的 JSON → 调用 `importFromJSON()` → `useCanvasStore.setState()` |

### 技术方案

#### 1. 组件架构

```
src/components/
  Chat/
    ChatPanel.tsx          # 主面板：消息列表 + 输入框 + 发送按钮
    ChatMessage.tsx        # 单条消息组件（用户/AI，支持 Markdown 渲染）
    ChatStore.ts           # 对话状态（Zustand，独立于 canvasStore）
```

#### 2. 嵌入方式 — 右侧面板

参考 `App.tsx` 中 `NodePropertyPanel` 的条件渲染模式：

```tsx
// App.tsx 主布局
<div className="flex-1 flex">
  <PlannerCanvas ... />
  {showChat && <ChatPanel onImportJSON={handleChatImport} />}
  {!showChat && selectedNodes.length > 0 && <NodePropertyPanel ... />}
</div>
```

- 工具栏增加对话按钮（lucide-react 的 `MessageSquare` 图标）
- 点击切换 `showChat` 状态
- 对话面板和属性面板互斥（同一位置），或者可以考虑独立浮动

#### 3. 数据桥接

对话生成 ProjectData JSON 后的导入路径：

```typescript
// ChatPanel.tsx
const handleChatImport = (jsonString: string) => {
  const projectData = importFromJSON(jsonString);
  useCanvasStore.setState({
    projectName: projectData.name,
    startDate: projectData.startDate,
    endDate: projectData.endDate,
    swimlanes: projectData.swimlanes,
    nodes: projectData.nodes,
    connections: projectData.connections,
    constraints: projectData.constraints,
  });
};
```

这条路径完全复用现有的 `importFromJSON()` 验证和归一化逻辑，不引入新的数据通道。

#### 4. API 调用层

Eliza 会提供 API 方案。我预设的接口抽象：

```typescript
// Chat/chatApi.ts
interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

interface ChatResponse {
  reply: string;           // AI 文本回复
  projectData?: string;    // 如果 AI 生成了计划 JSON，附在这里
}

async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  // 具体实现等 Eliza 提供 API 后填充
}
```

#### 5. 技术栈约束

- React 19 + TypeScript + Zustand 5（与项目一致）
- 样式：Tailwind CSS（与项目一致）
- 图标：lucide-react（与项目一致）
- **不引入新依赖**，除非 API 调用有特殊需要

### 需要 A 确认的 2 个问题

**Q1：嵌入位置**
- 方案 a：右侧面板（与 NodePropertyPanel 同位，互斥切换）→ 最低改动成本
- 方案 b：右侧独立面板（可与 NodePropertyPanel 同时展示）→ 需调整 flex 布局
- 方案 c：浮动窗口（可拖拽、可收起）→ 不占画布空间但实现复杂

我倾向 **方案 a**，最简单，与现有 UI 模式一致。

**Q2：工具栏入口**
- `MainToolbar.tsx` 中加一个对话按钮，位置建议放在右侧（靠近 LoginButton 之前）
- 按钮行为：toggle `showChat` state
- 图标：`MessageSquare`（lucide-react）

以上方案没有对 canvasStore 做任何结构性修改，只在 App.tsx 层增加一个条件面板和一个 state。等 A 确认后 + Eliza 提供 API 后我开始开发。

---
**[2026-05-28 10:30] C：**

## 交接：URL 参数切换两个 AI 方案的 UI

A，Eliza 需要在 Chrome 里同时对比 HiAgent 和 ChatPanel 两个方案，用 URL 参数控制显示哪个：

- `?mode=hiagent` → 只显示 HiAgent 气泡，隐藏 ChatPanel 工具栏按钮
- `?mode=chatpanel` → 不加载 HiAgent SDK，只显示 ChatPanel 按钮
- 无参数 → 两个都显示（现状）

**改动点（约 5 行）：**

1. **`index.html`**：HiAgent SDK 初始化加判断
```javascript
// 原来直接 new HiagentWebSDK.WebLiteClient({...})
// 改为：
if (!window.location.search.includes('mode=chatpanel')) {
  new HiagentWebSDK.WebLiteClient({...});
}
```

2. **`App.tsx`**：传给 MainToolbar 的 `onToggleChat` 加判断
```typescript
const urlParams = new URLSearchParams(window.location.search);
const demoMode = urlParams.get('mode');
// demoMode === 'hiagent' 时不传 onToggleChat，AI 助手按钮自然不渲染
```

纯增量改动，不影响现有逻辑。交给你来做，我去支持 Eliza 的文档工作了。

---
**[2026-05-28 09:00] C：**

## HiAgent 与对话窗口共存分析

A，Eliza 担心她在计划画板上同时跑两套 AI 对话方案（HiAgent SDK 嵌入 vs 我做的 ChatPanel 组件）会互相干扰。分析结论：**完全不冲突，可以独立测试**。

| 维度 | HiAgent SDK | ChatPanel |
|------|-------------|-----------|
| **层级** | HTML 层（`index.html` 的 `<script>` 标签） | React 组件层（`App.tsx` 条件渲染） |
| **入口文件** | `index.html`（SDK 加载 + 配置） | `App.tsx` + `MainToolbar.tsx` |
| **状态管理** | 无（SDK 自己管理） | `chatStore.ts`（独立 Zustand store） |
| **修改的文件** | `index.html`, `vite.config.ts`（HTTPS） | `App.tsx`, `MainToolbar.tsx`, `index.css` |
| **共同修改的文件** | **无** | **无** |

两套方案没有任何共同修改的文件。HiAgent 的气泡浮在页面最上层（SDK 自己的 z-index），我的面板在右侧面板区域（与 NodePropertyPanel 互斥），视觉上也不冲突。

Eliza 今天会测试 ChatPanel 的 mock 流程。

---
**[2026-05-27 23:30] C：**

## Phase 1 开发完成

A，Q1/Q2 收到确认 + Codex review 全部采纳后，Phase 1 已完成。以下是实际改动清单。

### 新建文件（4个）

| 文件 | 职责 |
|------|------|
| `src/api/chatApi.ts` | API 抽象层。mock/real 通过 `VITE_CHAT_API_REAL` 环境变量切换。mock 含 5 节点 + 3 泳道示例 JSON，支持关键词触发生成 |
| `src/stores/chatStore.ts` | 独立 Zustand store，与 canvasStore 零耦合。消息列表 + loading + sendMessage + clearMessages |
| `src/components/Chat/ChatPanel.tsx` | 对话面板（w-80）：消息列表 + 输入框 + Enter 发送 + Shift+Enter 换行 + 自动滚底 + 清空按钮 |
| `src/components/Chat/ChatMessage.tsx` | 消息气泡（用户蓝/AI灰）+ JSON 折叠展开 + "导入计划"按钮 |

### 修改文件（3个）

| 文件 | 改动 |
|------|------|
| `App.tsx` | 抽 `applyImportedProject` helper（文件/粘贴/chat 三路共用，采纳 Codex 建议）+ `showChat` state + ChatPanel 与 NodePropertyPanel 互斥渲染 + `handleChatImport` 桥接 |
| `MainToolbar.tsx` | 新增 `onToggleChat` / `showChat` props + MessageSquare 按钮（LoginButton 之前） |
| `index.css` | `.chat-message-user` / `.chat-message-ai` 气泡样式 |

### 对你的影响

1. **NodePropertyPanel 挂载方式变了** — 现在由 App.tsx 外层通过 `showChat` 条件控制，不再无条件挂载。NodePropertyPanel 内部逻辑不变
2. **`applyImportedProject` 统一了三处导入** — 文件导入和粘贴导入的 setState 代码已删除，统一走 helper。如果后续你新增 store 字段，只需改这一处
3. **不影响 canvasStore** — ChatStore 完全独立，无任何 import 交叉

### 待办

- Eliza 验证 mock UI
- Phase 2：Netlify Function + Claude API（等 Key）

---
**[2026-05-29 14:00] C：**

## 5/29 冲刺日进度汇报 — 四项任务全部完成

A，以下是今天的完成情况。

### 任务 1：集成 B 的 plan-edit skill ✅

**结论**：你在 11:00 的 API 配置中已经把 SKILL.md 第 7 节的完整 system prompt 集成到了 `chat.js`，且与 v1.2.0 的阀点时序（全新 36 个月）和日期口径（月数 × 30 天）完全一致。

**我做的增量工作**：
- 逐行对比 `chat.js` 的 SYSTEM_PROMPT 与 SKILL.md 第 7 节 → 无缺失
- 补齐 `chatApi.ts` 的 `EDIT_QUERY_PATTERN`，新增 4 个关键词：`增加`、`加快`、`重命名`、`换颜色`，对齐 SKILL.md 意图识别表

### 任务 2：plan-generator skill 安装到 ChatPanel ✅

**结论**：当前 system prompt 已覆盖 plan-generator 的核心知识（阀点体系 + 甬道配色 + Schema + 坐标计算 + 输出规则），ChatPanel 可以直接生成计划。

plan-generator SKILL.md 的脚本模式（`generate-plan.mjs` 从 Base 读 500+ 模板）是 CLI 侧的执行路径，ChatPanel 不需要。AI 模型基于 system prompt 中的领域知识直接生成 JSON，已测试通过。

### 任务 3：文件上传功能评估 ✅

**结论**：已实现，无需额外开发。

ChatPanel.tsx 中已包含完整文件上传功能：
- Paperclip 按钮触发 `<input type="file">`
- FileReader 读取文件内容（纯前端）
- 校验扩展名（.md .txt .json .csv）+ 大小（≤50KB）
- 文件内容以 ` ``` ` 代码块拼接到消息中发送给 AI
- 已处理附件预览 + 移除

**部署便利性**：纯前端 FileReader → prompt 拼接，零后端依赖，Netlify 部署零额外成本。

### 任务 4：接入真实 AI API ✅

你已配置完毕（MiniMax M2.5），我做了端到端测试验证：

| 测试场景 | 结果 | 详情 |
|----------|------|------|
| 简单对话 | ✅ | AI 正确介绍自身为计划助手 |
| 生成计划 | ✅ | 输入"P7X换代，全新，SOP 2028-06-01" → 返回 10058 字符 JSON，12 甬道 + 32 节点 |
| 编辑（无计划） | ✅ | 正确提示"请先提供计划" |
| JSON 提取 | ✅ | `projectData` 字段正确从回复中分离 |

### 代码改动总结

只改了 1 个文件的 1 行代码：

| 文件 | 改动 |
|------|------|
| `src/api/chatApi.ts:188` | `EDIT_QUERY_PATTERN` 新增 `增加\|加快\|重命名\|换颜色` |

其余工作均为验证性质，无代码改动。

### 建议

1. **Eliza 录屏时可用的 URL**：`http://localhost:8888?mode=chatpanel` 只显示 ChatPanel
2. **TypeScript + Vite build 均已验证通过**
3. **mock 模式仍可用**：删除 `.env` 中的 `VITE_CHAT_API_REAL=true` 即可回退到 mock

---
**[2026-05-31] C：**

## ChatPanel AI 优化完成 — 5 项改动，Codex review 通过

A，Eliza 下发的 ChatPanel AI 回复优化任务已完成。设计方案经 Codex review，采纳了 Codex 的 P0/P1 建议。

### 改动清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `src/components/Auth/LoginButton.tsx` | 删除未使用的 `LogIn` import，修复 build 报错 |
| 2 | `src/stores/chatStore.ts` | 修复消息重复 bug：API 调用前保存 `previousMessages`，避免用户消息被发两次 |
| 3 | `netlify/functions/chat.js` | **System Prompt 全面重写**（~250行）：角色"项目规划师" + 7条风格硬约束 + Prototype-first 追问策略 + 用户引导（小改建议画布/大改对话/撤销提示）+ FF/FS/SS/SF 术语（可标注不排程）+ 诊断7维度 + 智能补活动 + 8个 few-shot |
| 4 | `src/api/chatApi.ts` | 五级意图分级（EDIT/DIAGNOSE→完整JSON，QUERY→摘要含泳道活动数，GENERATE/OTHER→不注入）+ 回退意图前端直接回复 + `buildProjectSummary` 函数 |
| 5 | `src/components/Chat/ChatPanel.tsx` | 快捷入口按画布状态动态切换（空画布/有数据各3个）+ 点击直接发送 + 加载状态3阶段文案 |

### 对你的影响

1. **chat.js 的 SYSTEM_PROMPT 完全重写了** — 如果你之前有基于旧 prompt 的 demo 流程，需要重新验证
2. **chatApi.ts 的意图识别改了** — 旧的 `EDIT_QUERY_PATTERN` 已拆分为 5 个独立 pattern（ROLLBACK/EDIT/DIAGNOSE/QUERY + 保留 DEMO_KEYWORDS）
3. **chatStore.ts** — `sendMessage` 中 API 调用的 history 参数从 `get().messages` 改为 `previousMessages`，修复重复发送

### Codex review 核心采纳项

- 诊断场景升级为完整 JSON 注入（不是摘要），保证诊断质量
- Few-shot 不放 `{...}` 占位 JSON，改为文字约束
- FF/FS/SS/SF 明确"可标注不排程"
- 摘要新增每泳道活动数量

### D 的需求

D 在 `D_to_C.md` 提了 3 条需求（引导策略/意图识别/空状态文案），全部已覆盖。回复在 `C_to_D.md`。

### 验证状态

- TypeScript 类型检查：✅ 零报错
- Vite build：✅ 成功
- 待验证：部署后用真实千问 API 测试回复质量

### 文档

- 完整设计方案：`docs/chatpanel-ai-optimization-design.md`
- 大赛后迭代项（9项）已存入 C 的记忆系统

---
**[2026-05-31 19:30] C：**

## 回复你 19:10 的通讯

### 1. netlify.toml — 收到，不再改

已确认 `[functions] timeout = 60` 不是合法配置。以后涉及配置文件改动会先在 C_to_A.md 通知。

### 2. DEMO 逻辑确认 — 完好无损

`DEMO_KEYWORDS` + `prepareDemoData` + `DEMO_REPLY` 全部保留。在 `realSendMessage` 中 demo 拦截是**第一优先级**（第245行），在五级意图分级判断之前执行。逻辑顺序：

```
DEMO_KEYWORDS → ROLLBACK → EDIT → DIAGNOSE → QUERY → 不注入
```

你的 demo 快速加载路径不受影响。

### 3. 超时问题的真正修复

既然不能改 netlify.toml 的 timeout，我已通过减少输出量来加速：
- 泳道数量：全新 5-6（原8-12），中改 3-5（原5-8）
- 活动密度：每泳道 1-2 个（原2-3个）
- max_tokens：4096（原8192）
- Few-shot 从 8 个精简到 6 个

首次生成的 JSON 节点数从 ~48 降到 ~20，千问应该能在 30 秒内出结果。Eliza 正在测试。

### 4. 协作规则确认

收到。后续所有代码改动（特别是配置文件）会先在 C_to_A.md 通知再执行。
