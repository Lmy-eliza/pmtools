# Smart Planner — 整车项目计划智能助手

> **一句话定位**：用 AI 对话自动生成整车研发项目计划，替代 8 人天的手工排期工作，1 小时内完成。
>
> **在线体验**：https://project-planner-pmtools.netlify.app/?mode=chatpanel
> **代码仓库**：https://github.com/Lmy-eliza/pmtools

---

## 为什么做这个项目

一个整车项目的计划包含 **500+ 活动、13 个阀点、33 条泳道**。传统方式是项目经理在 Excel 或画板工具中手动逐条排期，耗时 **8 人天以上**，且每换一个车型规模就要重新来过。

Smart Planner 解决的核心问题：**让 AI 读懂企业沉淀的标准化活动模板，自动倒推排期，一键生成可视化的项目计划。**

---

## 核心价值

| 价值 | 说明 |
|------|------|
| **数据驱动** | 532 条活动模板 + 13 个阀点定义 + 33 条泳道分类，全部来自真实项目经验，存储在飞书多维表格中，不是 AI 编造的 |
| **对话式交互** | 自然语言输入（"生成一个全新车型计划，SOP 2028-06-01"），非技术人员零门槛使用 |
| **协议化输出** | ProjectData JSON Schema v1.0 — 计划数据从 UI 状态升级为可交换协议，AI Agent 可读可写 |
| **Agent Team 协作开发** | 5 个 AI Agent（A/B/C/D/Codex）分工协作完成产品交付，不是人用 AI 辅助，而是 AI 组队开发 |

---

## 功能全景

### 画布核心

| 功能 | 说明 |
|------|------|
| 8 种节点类型 | 五边形（阀点 G0-G10）、菱形（里程碑）、矩形（活动）、三角形（决策点）、星形、圆形、六边形、Emoji |
| 泳道管理 | 新增 / 重命名 / 拖拽排序 / 删除 / 折叠 / 冻结前 N 行 |
| 动态时间轴 | 日 / 周 / 月 / 季度四种视图，缩放 50%-200% |
| 连接线 | 普通连线 + 关键路径高亮，锚点选择，拐点拖拽 |
| 时间约束 | 节点间月数约束，周期检测（DFS）+ 约束传播（BFS） |
| 框选 & 多选 | 拖拽矩形框选，批量操作 |
| 撤销 / 重做 | 最多 50 步历史记录 |
| TODAY 标线 | 红色竖线标识当前日期 |
| 状态追踪 | 节点状态（未开始/进行中/已完成/延期），底部 StatsBar 实时统计 |

### AI 对话（Smart Planner 项目规划师）

| 功能 | 说明 |
|------|------|
| 计划生成 | 输入项目名 + 车型规模 + SOP 日期 → AI 输出完整 ProjectData JSON → 一键导入画布 |
| 计划编辑 | "把 G5 延后 15 天" → AI 修改 JSON 并说明影响范围 |
| 计划查询 | "G5 到 G4 之间多少天？" → AI 直接回答 |
| 文件上传 | 支持 .md / .txt / .json / .csv 文件上传作为对话上下文 |
| 双 API 格式 | OpenAI 兼容（千问）和 Anthropic 兼容（MiniMax M2.5），通过环境变量切换 |

### 数据导入导出

| 功能 | 说明 |
|------|------|
| JSON 导入 | 文件导入 或 粘贴导入，自动校验 Schema（必填字段、节点类型、泳道引用、日期格式） |
| JSON 导出 | 完整 ProjectData JSON，含 `schemaVersion: "1.0"` |
| DrawIO 导出 | 生成 `.drawio` 文件，可直接导入飞书画板或 draw.io |
| 复制为图片 | Konva 画布 + 左侧泳道标签合成为 PNG，一键复制到剪贴板 |

### 项目管理

| 功能 | 说明 |
|------|------|
| 本地持久化 | IndexedDB（Dexie），多项目多版本存储 |
| 云端同步 | 飞书多维表格存储 + OAuth 2.0 登录 + 10 秒轮询冲突检测 |
| 版本快照 | 命名保存历史版本，随时回退 |
| 自动保存 | 防抖保存（离线 2 秒 / 在线 3 秒），关闭页面时强制保存 |

---

## 快速体验

### 在线 Demo

打开 https://project-planner-pmtools.netlify.app/?mode=chatpanel ，点击右上角 项目规划师按钮打开「Smart Planner 项目规划师」，试试说：

```
生成一个全新车型的项目计划，SOP 2028-06-01
```

AI 会生成包含阀点、泳道、活动节点的完整项目计划 JSON，点击「导入计划」即可在画布中查看。

### 本地运行

```bash
cd project-planner
npm install
npx netlify dev    # 启动开发服务器（含 Serverless Functions）
```

> **注意**：AI 对话功能依赖 `.env` 中配置的 API Key。本地运行需配置 `CHAT_API_KEY`、`CHAT_API_BASE_URL`、`CHAT_MODEL` 等环境变量。

纯前端开发（不含 AI 对话）：

```bash
npm run dev        # Vite 开发服务器，http://localhost:5173
npm run build      # 生产构建
```

---

## 用户路径

Smart Planner 设计了清晰的使用流程，覆盖从计划生成到持续迭代的完整场景：

### 路径 1：AI 对话生成计划（主流程）

```
打开 Smart Planner → 点击 项目规划师
    ↓
输入项目信息："G9X 全新车型，SOP 2028-06-01"
    ↓
AI 确认参数 → 生成 ProjectData JSON
    ↓
点击「导入计划」→ 画布自动渲染泳道图
    ↓
在画布上浏览、检查计划
```

### 路径 2：计划微调（小改动）

当需要调整 1-2 个节点时，**直接在画布上操作更高效**：

- 拖拽节点调整时间位置
- 双击节点编辑名称
- 选中节点后在右侧属性面板修改颜色、日期等属性
- 使用快捷键 `Ctrl+Z` 撤销，`Ctrl+Shift+Z` 重做

### 路径 3：AI 迭代编辑（大改动）

当需要批量修改或涉及活动关联关系时，**回到 AI 对话**：

```
"把 G5 延后 15 天"
"在测试泳道新增一个集成测试活动，工期 3 个月"
"删除所有海外相关的活动"
```

AI 会修改 JSON 并说明影响范围，再次点击「导入计划」更新画布。

### 路径 4：版本回退

- **撤销操作**：工具栏 ↩️ 按钮或 `Ctrl+Z`，最多 50 步
- **版本快照**：通过版本历史面板保存/恢复命名版本

### 路径 5：导出分享

- **导出 JSON**：工具栏 → 更多菜单 → 导出 JSON（可供其他 Agent 或系统读取）
- **导出 DrawIO**：工具栏 → 导出按钮 → 生成 `.drawio` 文件 → 导入飞书画板
- **复制为图片**：工具栏 → 📷 按钮 → 画布截图复制到剪贴板

---

## 技术架构

### 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React + TypeScript | 19.2 / 5.9 | — |
| 画布引擎 | Konva + react-konva | 10.2 / 19.2 | HTML5 Canvas 高性能渲染 |
| 构建工具 | Vite | 7.3 | 条件式 HTTPS 支持（本地 HiAgent 调试） |
| 样式 | Tailwind CSS | 4.2 | @tailwindcss/vite 插件 |
| 状态管理 | Zustand | 5.0 | 单 Store 模式 |
| 本地存储 | Dexie (IndexedDB) | 4.3 | 离线优先 |
| 云端存储 | 飞书多维表格 API | — | 通过 Netlify Functions 代理 |
| 认证 | 飞书 OAuth 2.0 | — | OIDC 流程 |
| 部署 | Netlify | — | 静态构建 + Serverless Functions |
| AI 模型 | 千问 / MiniMax M2.5 | — | 通过 Netlify Functions 代理，双格式支持 |

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                    用户界面                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ChatPanel│  │ PlannerCanvas│  │  Toolbar /     │  │
│  │ AI 对话  │  │ Konva 画布   │  │  Panels        │  │
│  └────┬─────┘  └──────┬───────┘  └───────────────┘  │
│       │               │                              │
│  ┌────┴───────────────┴──────────────────┐          │
│  │         Zustand Store                  │          │
│  │   canvasStore (节点/连线/泳道/约束)     │          │
│  │   chatStore (消息/加载状态)             │          │
│  │   authStore (飞书认证)                 │          │
│  └────┬──────────────┬───────────────────┘          │
│       │              │                               │
│  ┌────┴────┐   ┌─────┴─────┐                        │
│  │ Dexie   │   │ chatApi   │                        │
│  │IndexedDB│   │ mock/real │                        │
│  └─────────┘   └─────┬─────┘                        │
└───────────────────────┼──────────────────────────────┘
                        │ HTTPS
              ┌─────────┴─────────┐
              │ Netlify Functions  │
              │  chat.js (AI代理)  │
              │  feishu-*.js (认证)│
              └─────────┬─────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────┴────┐  ┌──────┴─────┐  ┌────┴────┐
    │ 千问 /  │  │  飞书 API  │  │  飞书   │
    │ MiniMax │  │ (OAuth)    │  │ Bitable │
    └─────────┘  └────────────┘  └─────────┘
```

### 核心算法

| 算法 | 用途 | 实现 |
|------|------|------|
| 倒排计算 | 从 SOP 日期反推所有阀点和活动日期 | `scripts/generate-plan.mjs`，按「距 SOP 月数 × 30 天」计算 |
| 布局引擎 | 泳道内节点重叠检测 + 自动扩展高度 | `src/utils/layoutEngine.ts` |
| 关键路径 | 识别最长路径并高亮连接线 | `src/utils/criticalPath.ts` |
| 约束传播 | 拖动节点时自动联动约束节点 | `canvasStore.ts` 中 BFS 传播 + DFS 环检测 |
| DrawIO 导出 | 生成兼容飞书画板的 mxGraph XML | `src/utils/exportUtils.ts`（662 行） |

### 文件结构

```
project-planner/
├── src/
│   ├── main.tsx                          # 入口
│   ├── App.tsx                           # 根组件
│   ├── types/index.ts                    # TypeScript 接口定义
│   ├── api/
│   │   └── chatApi.ts                    # AI API（mock + real 双模式）
│   ├── stores/
│   │   ├── canvasStore.ts                # 画布状态（节点/连线/泳道/约束/历史）
│   │   ├── chatStore.ts                  # 对话状态
│   │   └── authStore.ts                  # 飞书认证状态
│   ├── hooks/
│   │   └── useCloudSync.ts              # 云端同步 + 冲突检测
│   ├── utils/
│   │   ├── storage.ts                    # IndexedDB + JSON 导入导出校验
│   │   ├── dateUtils.ts                  # 日期 ↔ 像素转换，时间轴生成
│   │   ├── layoutEngine.ts              # 泳道自动高度 + 重叠避让
│   │   ├── criticalPath.ts              # 关键路径算法
│   │   ├── exportUtils.ts               # DrawIO XML 导出
│   │   ├── statusUtils.ts               # 节点状态颜色映射
│   │   ├── feishuApi.ts                 # 飞书 Bitable CRUD
│   │   └── feishuAuth.ts               # OAuth 登录/登出/Token
│   ├── data/
│   │   └── presets.ts                    # 整车研发节点模板 + 颜色预设
│   └── components/
│       ├── Canvas/PlannerCanvas.tsx       # 主画布
│       ├── Toolbar/MainToolbar.tsx        # 顶部工具栏
│       ├── Chat/
│       │   ├── ChatPanel.tsx             # AI 对话面板
│       │   └── ChatMessage.tsx           # 消息组件（含 JSON 预览 + 导入按钮）
│       ├── Nodes/                        # 8 种节点渲染组件 + 连接线
│       ├── Panels/                       # 7 个功能面板
│       ├── Auth/LoginButton.tsx          # 飞书登录按钮
│       └── StatsBar.tsx                  # 状态统计栏
├── netlify/functions/
│   ├── chat.js                           # AI 对话代理（双格式支持）
│   ├── feishu-token.js                   # OAuth code → token
│   ├── feishu-refresh.js                 # Token 刷新
│   └── feishu-api.js                     # 飞书 API 通用代理
├── scripts/
│   └── generate-plan.mjs                 # 倒排计算引擎（CLI 脚本模式）
├── .claude/skills/
│   ├── plan-generator/SKILL.md           # 计划生成 Skill v1.1
│   └── plan-editor/SKILL.md              # 计划编辑 Skill v1.2
├── docs/                                 # 项目文档
├── _agent_comms/                         # Agent 间通信记录
├── index.html                            # 入口 HTML
├── vite.config.ts                        # 构建配置
├── netlify.toml                          # Netlify 部署配置
└── package.json
```

---

## ProjectData JSON Schema v1.0

ProjectData 是 AI Agent 与 Smart Planner 之间的通信协议。Agent 按此格式生成 JSON，Web 应用直接导入渲染；用户在画布上编辑后导出的 JSON 也遵循此格式，其他 Agent 可直接读取和二次编辑。

### 顶层结构

```json
{
  "schemaVersion": "1.0",
  "id": "string (UUID v4)",
  "name": "string (项目名称)",
  "startDate": "ISO 8601 (如 '2025-06-01T00:00:00.000Z')",
  "endDate": "ISO 8601",
  "swimlanes": [],
  "nodes": [],
  "connections": [],
  "constraints": [],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### Swimlane（泳道）

```json
{
  "id": "string (UUID v4)",
  "name": "string (泳道名称)",
  "order": "number (排序，从 0 开始)",
  "isCollapsed": "boolean (默认 false)"
}
```

### PlanNode（节点）

```json
{
  "id": "string (UUID v4)",
  "type": "NodeType",
  "name": "string (节点名称)",
  "color": "string (HEX 颜色)",
  "x": "number (画布 X 坐标，像素)",
  "y": "number (画布 Y 坐标，像素)",
  "date": "ISO 8601 (节点日期)",
  "swimlaneId": "string (所属泳道 ID)",
  "width": "number (可选，仅 rectangle 类型)",
  "endDate": "ISO 8601 (可选，仅 rectangle 类型)",
  "emoji": "string (可选，仅 emoji 类型)",
  "status": "string (可选，'not_started' | 'in_progress' | 'completed' | 'delayed')"
}
```

**NodeType 枚举**

| 类型 | 用途 | 形状 | 默认颜色 |
|------|------|------|---------|
| `pentagon` | 阀门 G0-G10/GTC | 五边形 | `#64D2FF` |
| `diamond` | 阶段门 TG、里程碑 | 菱形 | `#007AFF` |
| `rectangle` | 开发/测试活动（有工期） | 矩形条 | `#32ADE6` |
| `triangle` | 决策点 | 三角形 | `#AF52DE` |
| `star` | 重要里程碑 | 星形 | `#FFD700` |
| `circle` | 状态节点 | 圆形 | `#34C759` |
| `hexagon` | 特殊节点 | 六边形 | `#5856D6` |
| `emoji` | 带 emoji 标记 | emoji | `#FF9500` |

### Connection（连接线）

```json
{
  "id": "string (UUID v4)",
  "sourceNodeId": "string (起点节点 ID)",
  "targetNodeId": "string (终点节点 ID)",
  "style": "'solid' | 'dashed' | 'dotted'",
  "color": "string (可选)",
  "isCriticalPath": "boolean (可选)",
  "pathConfig": {
    "sourceAnchor": "'top' | 'bottom' | 'left' | 'right'",
    "targetAnchor": "'top' | 'bottom' | 'left' | 'right'",
    "bendPoints": [{ "rx": 0.5, "ry": 0.5 }]
  }
}
```

| style | 用途 |
|-------|------|
| `solid` | 强依赖（必须完成才能开始） |
| `dashed` | 弱依赖（建议顺序） |
| `dotted` | 信息流 |

### TimeConstraint（时间约束）

```json
{
  "id": "string (UUID v4)",
  "sourceNodeId": "string",
  "targetNodeId": "string",
  "offsetMonths": "number (间隔月数，可为负)",
  "isLocked": "boolean",
  "style": "'solid' | 'dashed' | 'dotted' (可选)",
  "color": "string (可选)"
}
```

### 坐标计算规则

```
monthWidth = 200（每月 200 像素，画布默认 100px，生成时用 200px）
swimlaneHeight = 120（每泳道 120 像素）
headerHeight = 60（时间轴头部）

node.x = (nodeDate - projectStartDate).totalDays × (monthWidth / 30)
node.y = headerHeight + swimlane.order × swimlaneHeight + verticalOffset

rectangle.width = (endDate - startDate).totalDays × (monthWidth / 30)
```

### 最小有效 JSON 示例

```json
{
  "schemaVersion": "1.0",
  "id": "demo-001",
  "name": "示例项目",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T00:00:00.000Z",
  "swimlanes": [
    { "id": "sw-1", "name": "项目管理", "order": 0, "isCollapsed": false }
  ],
  "nodes": [
    {
      "id": "n-1",
      "type": "pentagon",
      "name": "G0",
      "color": "#64D2FF",
      "x": 1200,
      "y": 120,
      "date": "2026-06-01T00:00:00.000Z",
      "swimlaneId": "sw-1"
    }
  ],
  "connections": [],
  "constraints": []
}
```

---

## 阀点体系

Smart Planner 的倒排计算基于整车研发标准阀点体系，支持 5 种车型规模：

| 阀点 | 含义 | 平台首发 & 全新 | 中改 | 小改 | 海外 |
|------|------|:---:|:---:|:---:|:---:|
| G10 | 项目启动 | -36 月 | -18 月 | -12 月 | -10 月 |
| G9 | 概念可行性 | -30 月 | -15 月 | — | — |
| G8 | 方案冻结 | -26 月 | -14 月 | -8 月 | -10 月 |
| G7 | 工程样件启动 | -22 月 | -12 月 | — | — |
| G6 | 工程样件验证 | -18 月 | -10 月 | — | — |
| G5 | 生产准备启动 | -14 月 | — | — | — |
| G4 | 小批量试产 | -12 月 | -8 月 | -5 月 | -6 月 |
| G3 | 生产验证 | -8 月 | -6 月 | -3 月 | -4 月 |
| G2 | 量产准备确认 | -5 月 | -4 月 | — | — |
| G1 | 量产启动确认 | -3 月 | -2 月 | -1 月 | -2 月 |
| G0 | SOP 量产启动 | 0 | 0 | 0 | 0 |
| GTC | 工装完成 | +3 月 | +2 月 | +1 月 | +2 月 |

> "—" 表示该规模不适用此阀点。日期计算：`阀点日期 = SOP日期 + 距SOP月数 × 30天`。

---

## AI Agent Skill

### plan-generator（v1.1）

倒排计算引擎，从飞书 Bitable 模板库自动生成项目计划。

```bash
# CLI 脚本模式（直接调用）
node scripts/generate-plan.mjs --scale 全新 --sop 2028-06-01

# Claude Code Skill 模式
# 在 Claude Code 中直接对话即可触发
```

**输入**：项目名称 + 车型规模（5 选 1）+ SOP 目标日期

**输出**：完整 ProjectData JSON，可直接导入 Smart Planner 画布

**生成规模**：
- 全新车型：12 阀点 + 84 活动 = **96 节点**
- 平台首发：12 阀点 + 446 活动 = **458 节点**

### plan-editor（v1.2）

对话式计划编辑 Skill，支持自然语言修改已有计划。

**能力**：
- 时间调整（延后/提前节点日期）
- 增删节点和泳道
- 属性修改（改名、换颜色、改状态）
- 计划查询（统计、间距计算、风险分析）

**原则**：单点编辑，不自动级联。AI 会列出可能受影响的关联节点，由用户决定是否继续调整。

---

## 飞书数据源

Smart Planner 的活动模板数据存储在飞书多维表格中：

**Base Token**：`YXtcb43qOaTLLVsI1FGc1ZXFnUb`

| 表名 | Table ID | 记录数 | 用途 |
|------|----------|--------|------|
| 活动模板表 | `tblb3VeOmziHd6SJ` | 532 | 标准活动定义（19 字段） |
| 阀点定义表 | `tblbEit1yZPEmhOv` | 13 | G10 ~ GTC 阀点时间定义 |
| 泳道定义表 | `tblhTrgNYilxOYQY` | 33 | 泳道分类与配色 |
| 依赖关系表 | `tbli5zBwZHiqmjIT` | — | 活动间依赖关系（待填充） |

---

## Agent Team 协作

本项目由 5 个 AI Agent 分工协作开发，通过 `_agent_comms/` 目录的 Markdown 文件异步通信：

| Agent | 角色 | 职责 |
|-------|------|------|
| **Agent A** | 架构师 + 主开发 | Web 应用开发、ProjectData Schema 设计、plan-generator Skill、画布渲染优化 |
| **Agent B** | 数据工程师 | 飞书 Bitable 建表、数据迁移、plan-editor Skill 编写 |
| **Agent C** | 集成工程师 | ChatPanel 对话集成、API 连接、system prompt 调优 |
| **Agent D** | 交付官 | 比赛文档撰写、叙事设计、提交物料整理 |
| **Codex** | 代码审查 | 4 轮技术 Review（性能/架构/API 集成/Skill 质量） |

**协作机制**：
- Schema 变更权归 Agent A，变更需通知全体
- 每个 Agent 产出后写入通信文件，下游 Agent 主动拉取
- `shared_state.md` 作为全局进度看板
- **Eliza（产品经理 / 人类）** 负责需求决策和最终审批

---

## 三套 AI 对话方案

Smart Planner 同时探索了三种 AI 对话方案，验证不同场景下的最优解：

| 维度 | 方案一：飞书妙搭 | 方案二：HiAgent SDK | 方案三：自建 ChatPanel |
|------|:---:|:---:|:---:|
| **对话** | ✅ 内置 | ✅ 气泡 SDK | ✅ 自建面板 |
| **计划生成** | ✅ | ❌ 固定工作流 | ✅ |
| **画布编辑（手动）** | ✅ | ✅ | ✅ |
| **对话编辑（AI）** | ✅ | ❌ | ✅ |
| **计划导出** | ✅ | ✅ | ✅ |
| **Agent 读取** | ✅ | ❌ | ✅ |
| **部署限制** | 飞书生态内 | 同域 cookie 限制 | 无限制 |
| **模型灵活性** | 受限 | 受限 | 任意模型 |

**当前主推方案三**（自建 ChatPanel），评委在线体验使用此方案。

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `V` | 选择工具 |
| `D` | 添加菱形节点 |
| `T` | 添加三角形节点 |
| `R` | 添加活动（矩形） |
| `L` | 连线工具 |
| `Delete` / `Backspace` | 删除选中项 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Shift + Z` | 重做 |
| `Ctrl + S` | 保存项目 |
| `Ctrl + E` | 导出 DrawIO |
| `Escape` | 取消选择 |
| `?` / `F1` | 打开帮助面板 |

---

## 环境变量

```env
# 飞书应用（前端可见）
VITE_FEISHU_APP_ID=cli_xxx
VITE_FEISHU_BITABLE_APP_TOKEN=xxx
VITE_FEISHU_BITABLE_TABLE_ID=xxx

# AI 对话（仅后端使用）
CHAT_API_KEY=sk-xxx
CHAT_API_BASE_URL=https://api.example.com
CHAT_MODEL=model-name
CHAT_API_FORMAT=openai          # "openai" 或 "anthropic"
VITE_CHAT_API_REAL=true         # true 使用真实 API，false 使用 mock

# 可选：应用 ID（部分企业网关需要）
CHAT_APP_ID=xxx
```

---

## 项目文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 大赛交付文档 | [飞书文档](https://xiaopeng.feishu.cn/docx/UztWd3AOyojcY9xXNb9c92lunyd) | 完整的比赛提交文档 |
| 使用说明 | [飞书文档](https://xiaopeng.feishu.cn/docx/O1bldyT6uoszJhxMr7rckNEKntc) | 操作指南 |
| Agent 协作方案 | `docs/agent-team-protocol.md` | Agent Team 协作机制说明 |
| 项目全貌 | `docs/project-panorama-v1.md` | 技术架构与功能全景 |

---

## 开源协议

MIT License
