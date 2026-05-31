# Smart Planner — AI 对话窗口集成方案

> **作者**：Agent C | **日期**：2026-05-27  
> **状态**：待 Review（请 Codex / A / Eliza 给建议）

## Context

Smart Planner 比赛截止 5/31，需要在网页画布中嵌入 AI 对话窗口，让用户通过自然语言生成项目计划。当前 HiAgent 方案受限于同域 cookie（只能本地跑），妙搭方案迁移成本高（7-10天）。Eliza 决定走第三条路：**直接在现有 Planner 网页中加对话组件 + Claude API 后端**，最小改动、最快上线。

A 已确认：右侧面板互斥切换、w-80 宽度、ChatStore 独立于 canvasStore、工具栏加 MessageSquare 按钮。

Eliza 确认：直接用 Claude API（Sonnet），由她提供 API Key。Key 暂未到手，先用 mock 跑通 UI。

---

## 改动范围

### 新建文件（4个）

| 文件 | 职责 |
|------|------|
| `src/components/Chat/ChatPanel.tsx` | 对话面板主组件：消息列表 + 输入框 + 发送按钮 + JSON 导入确认 |
| `src/components/Chat/ChatMessage.tsx` | 单条消息组件：区分用户/AI，AI 消息支持检测 JSON 块并显示"导入计划"按钮 |
| `src/stores/chatStore.ts` | Zustand store：消息列表、loading 状态、发送/接收 action |
| `netlify/functions/chat.js` | Netlify Function：接收前端消息 → 调 Claude API → 返回 AI 回复（保护 API Key） |

### 修改文件（3个）

| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 加 `showChat` state + ChatPanel 条件渲染 + `handleChatImport` 回调 + MainToolbar 传 `onToggleChat` prop |
| `src/components/Toolbar/MainToolbar.tsx` | 加 `onToggleChat` prop + `showChat` prop + MessageSquare 按钮（放在 LoginButton 之前） |
| `src/index.css` | 加聊天气泡样式（复用现有 CSS 变量 `--accent`, `--border`, `--bg-secondary`） |

---

## 核心设计决策

### 1. ChatStore 完全独立

```typescript
// src/stores/chatStore.ts — 与 canvasStore 零耦合
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  projectData?: string; // AI 回复中检测到的 JSON 块
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}
```

- `sendMessage` fetch `/.netlify/functions/chat`，传 `{ message, history }`
- 正则检测 AI 回复中的 ` ```json ... ``` ` 代码块，提取为 `projectData`
- **不 import canvasStore**，桥接通过 App.tsx 的回调 prop 完成

### 2. 嵌入位置：右侧面板互斥

```tsx
// App.tsx 主内容区
<div className="flex-1 flex overflow-hidden">
  <PlannerCanvas ... />
  {showChat && <ChatPanel onImportJSON={handleChatImport} onClose={() => setShowChat(false)} />}
  {!showChat && <NodePropertyPanel />}
  <ConnectionPanel ... />
  <ConstraintPanel ... />
</div>
```

- `showChat=true` 时 NodePropertyPanel 不渲染
- ConnectionPanel / ConstraintPanel 不受影响
- 工具栏 MessageSquare 按钮 toggle `showChat`

### 3. 数据桥接路径

```
用户在 ChatPanel 输入
  → chatStore.sendMessage()
    → fetch /.netlify/functions/chat → Claude API (Sonnet)
    ← AI 文本回复（可能含 ```json ProjectData```)
  → ChatMessage 检测到 JSON 块 → 显示「导入到画布」按钮
  → 用户点击
    → App.handleChatImport(json)
      → importFromJSON() 验证+归一化（复用现有逻辑）
      → useCanvasStore.setState() 更新画布
      → Toast "计划已导入画布"
```

完全复用 `importFromJSON()` 的验证和归一化（包括 pentagon → diamond 转换），不引入新数据通道。

### 4. Netlify Function 代理

```javascript
// netlify/functions/chat.js
// 模式与现有 feishu-token.js 一致：前端不接触 API Key
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: SYSTEM_PROMPT, // 含 ProjectData Schema + 生成规则
    messages: [...history, { role: 'user', content: message }],
  }),
});
```

### 5. ChatPanel 布局

```
┌─────────────────────┐
│  AI 助手        [×]  │  ← panel-header
├─────────────────────┤
│                     │
│  消息列表           │  ← flex-1 overflow-y-auto，自动滚底
│  (ChatMessage × N)  │
│                     │
├─────────────────────┤
│ [输入框]      [发送] │  ← 底部固定
└─────────────────────┘
```

- 宽度 w-80（320px），与 NodePropertyPanel 一致
- 消息样式：用户右对齐蓝色气泡 / AI 左对齐灰色气泡
- 文本用 `<pre className="whitespace-pre-wrap">` 展示（不引入 markdown 库）

---

## 执行顺序

**Phase 1（现在做，不依赖 API Key）：**
1. `chatStore.ts` — Zustand store，sendMessage 先调 mock 函数
2. `ChatMessage.tsx` — 消息组件
3. `ChatPanel.tsx` — 面板组件
4. `App.tsx` — showChat state + 互斥渲染 + handleChatImport 桥接
5. `MainToolbar.tsx` — AI 助手按钮
6. `index.css` — 聊天样式
7. Mock 数据：硬编码一个包含 ProjectData JSON 的 AI 回复，验证"导入到画布"全链路

**Phase 2（拿到 API Key 后）：**
8. `netlify/functions/chat.js` — Claude API 代理函数
9. `chatStore.ts` — sendMessage 改为 fetch 真实端点
10. System Prompt 编写 — 嵌入 ProjectData Schema + 生成规则
11. 端到端测试 + 部署

---

## 验证方式

1. **UI 验证**：启动 dev server，点击工具栏 AI 助手按钮，确认面板正确展示/关闭/互斥
2. **对话验证**：发送消息，确认 loading 状态、消息渲染、自动滚底
3. **导入验证**：AI 返回含 JSON 的回复后，点击"导入到画布"，确认画布正确渲染节点
4. **互斥验证**：打开对话面板 → 选中节点 → 确认属性面板不弹出；关闭对话面板 → 选中节点 → 属性面板正常弹出
5. **部署验证**：Netlify 配置 `ANTHROPIC_API_KEY` 环境变量后，线上对话功能正常

---

## 不做的事

- 不引入 react-markdown 或其他 markdown 渲染库（A 明确要求）
- 不改动 canvasStore 结构（ChatStore 完全独立）
- 不改动 importFromJSON / validateProjectJSON 逻辑（复用现有）
- 不做流式响应（Netlify Functions 对 streaming 支持有限，先用完整响应）
- 不做对话历史持久化（比赛 Demo 阶段不需要）

---

## 请 Reviewer 关注的问题

1. **NodePropertyPanel 互斥逻辑**：当前 NodePropertyPanel 内部通过 `selectedNodeIds.length === 0` 自己决定是否渲染。加了 `showChat` 互斥后，需要确认：如果 showChat=true 且用户点击了节点，selectedNodeIds 会更新但面板不显示 — 关闭对话后面板是否能正确恢复？（答案应该是可以，因为 selectedNodeIds 是持久化在 store 里的）
2. **System Prompt 的 Schema 粒度**：把完整 ProjectData Schema 塞进 system prompt 会消耗大量 token。是否应该只给最小必要字段（name, nodes, swimlanes, connections）+ 一个示例 JSON？
3. **JSON 检测的可靠性**：用正则匹配 ` ```json ... ``` ` 代码块来提取 ProjectData。如果 AI 回复中有多个 JSON 块、或者 JSON 不在代码块里，怎么处理？建议：只取第一个 ```json 块，并在 system prompt 中明确要求 AI 将 ProjectData 放在单个 ```json 块中。
4. **错误处理**：Netlify Function 超时（默认 10s）对于 Claude API 可能不够。需要确认是否需要调高超时限制，或者前端加 loading 状态和超时提示。
