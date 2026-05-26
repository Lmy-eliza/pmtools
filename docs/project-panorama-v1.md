# Smart Planner 项目全貌 v1.0

> **整理日期**：2026-05-26
> **整理目的**：盘点当前项目状态，为迁移飞书妙搭提供完整输入
> **项目地址**：https://project-planner-pmtools.netlify.app/

---

## 一、项目定位

**一句话**：面向整车研发的自动化项目计划生成与可视化工具。

**核心流程**：
```
用户输入（项目名 + 车型规模 + SOP日期）
    ↓
AI Agent 读取飞书多维表格（532条标准活动模板）
    ↓
自动倒推排期，生成 ProjectData JSON
    ↓
Web 画布渲染（甘特图 / 泳道图）
    ↓
导出 DrawIO → 飞书画板 / 本地编辑
```

**核心价值**：一个新车型项目有 500+ 活动、13 个阀点、33 条甬道。手工排计划耗时长且易出错，Smart Planner 让 Agent 自动排期 + 可视化呈现。

---

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | React + TypeScript | 19.2 / 5.9 | — |
| **构建** | Vite | 7.3 | 条件式 HTTPS 支持 |
| **样式** | Tailwind CSS | 4.2 | via @tailwindcss/vite 插件 |
| **画布渲染** | Konva + react-konva | 10.2 / 19.2 | HTML5 Canvas |
| **状态管理** | Zustand | 5.0 | 单 store 模式 |
| **本地存储** | Dexie (IndexedDB) | 4.3 | 离线优先 |
| **云端存储** | 飞书多维表格 API | — | 通过 Netlify Functions 代理 |
| **认证** | 飞书 OAuth 2.0 | — | OIDC 流程 |
| **部署** | Netlify | — | 静态构建 + Serverless Functions |
| **AI 助手** | HiAgent WebSDK | — | 本地验证通过，部署受限 |
| **图标** | lucide-react | 0.577 | — |
| **日期** | date-fns | 4.1 | — |

---

## 三、功能模块清单

### 3.1 画布核心（PlannerCanvas — 1163 行）

| 功能 | 状态 | 说明 |
|------|------|------|
| 8 种节点类型 | ✅ | 菱形/五边形/矩条形/三角形/星形/圆形/六边形/Emoji |
| 节点 CRUD | ✅ | 创建/选择/多选/拖拽/删除/属性编辑 |
| 动态时间轴 | ✅ | 日/周/月/季度 四种视图，切换不丢数据 |
| 泳道管理 | ✅ | 新增/重命名/拖拽排序/删除/折叠 |
| 连接线 | ✅ | 普通+关键路径，锚点路由，拐点拖拽，多选 |
| 时间约束 | ✅ | 周期检测(DFS)，约束传播(BFS)，面板管理 |
| 框选 | ✅ | 拖拽矩形多选节点 |
| 悬停提示 | ✅ | 节点信息卡片 |
| 拖拽提示 | ✅ | 拖动时顶部显示日期 |
| TODAY 线 | ✅ | 红色竖线 + 超出范围指示器 |
| 左侧面板 | ✅ | 项目名编辑 + 泳道名编辑，可拖拽调整宽度 |

### 3.2 工具栏（MainToolbar）

| 功能 | 状态 | 说明 |
|------|------|------|
| 工具切换 | ✅ | 快捷键 V/D/G/R |
| 更多图形 | ✅ | 三角/星形/圆形/六边形/自定义Emoji |
| 导出 DrawIO | ✅ | 完整 XML（时间轴+节点+连接+约束+网格）|
| 复制为图片 | ✅ | Konva toDataURL + 左侧面板合成 |
| JSON 导入/导出 | ✅ | 含校验，支持粘贴导入 |
| 缩放控制 | ✅ | 50%-200% |
| 时间轴切换 | ✅ | 日/周/月/季度 |
| 撤销/重做 | ✅ | 最多50步历史 |
| 飞书登录 | ✅ | OAuth 2.0 |

### 3.3 面板系统

| 面板 | 状态 | 说明 |
|------|------|------|
| NodePropertyPanel | ✅ | 节点/连接/约束属性编辑 |
| ConstraintPanel | ✅ | 约束关系管理 |
| ConnectionPanel | ✅ | 连接线清单 |
| ProjectListPanel | ✅ | 项目列表（本地+云端） |
| ProjectSettingsPanel | ✅ | 日期范围+间隔设置 |
| VersionHistoryPanel | ✅ | 版本快照管理 |
| HelpPanel | ✅ | 快捷键+使用指南 |
| StatsBar | ✅ | 状态统计（完成/进行中/延期/完成率） |

### 3.4 数据与算法

| 功能 | 状态 | 说明 |
|------|------|------|
| 布局引擎 | ✅ | 泳道内重叠检测 + 自动扩展高度 |
| 关键路径算法 | ✅ | 节点排序 + 顺序连接 + 高亮 |
| DrawIO 导出引擎 | ✅ | 662 行，完整 mxGraph XML 生成 |
| 自动保存 | ✅ | 防抖（离线2s/在线3s），beforeunload 强制保存 |
| 云端冲突检测 | ✅ | 10s 轮询 updatedAt，冲突时用户选择 |

### 3.5 AI Agent 功能

| 功能 | 状态 | 说明 |
|------|------|------|
| plan-generator Skill | 🔧 开发中 | 读飞书模板 → 倒推排期 → 输出 JSON |
| HiAgent 网页气泡 | ⚠️ 本地通过 | 受同域 cookie 限制，部署不可用 |
| 飞书妙搭迁移 | 📋 规划中 | 替代 HiAgent，解决部署+认证问题 |

---

## 四、数据架构

### 4.1 前端数据模型（ProjectData JSON Schema v1.0）

```
ProjectData
├── id, name, schemaVersion
├── startDate, endDate
├── swimlanes[]          — id, name, order, isCollapsed
├── nodes[]              — id, type(8种), name, color, x, y, date, swimlaneId, [width, endDate, emoji, status]
├── connections[]        — sourceNodeId, targetNodeId, style, color, isCriticalPath, pathConfig
├── constraints[]        — sourceNodeId, targetNodeId, offsetMonths, isLocked
└── createdAt, updatedAt
```

**坐标计算**：monthWidth=200px, swimlaneHeight=120px, headerHeight=60px

### 4.2 本地存储（IndexedDB via Dexie）

- **数据库名**：`ProjectPlannerDB`（v2）
- **projects 表**：完整 ProjectData，索引 id/name/createdAt/updatedAt
- **versions 表**：命名快照，索引 id/projectId/createdAt

### 4.3 云端存储（飞书多维表格）

**App Token / Table ID** 通过环境变量注入（`VITE_FEISHU_BITABLE_APP_TOKEN` / `VITE_FEISHU_BITABLE_TABLE_ID`）。

记录结构：`projectId`, `name`, `owner`, `ownerName`, `startDate`, `endDate`, `updatedAt`, `updatedBy`, `data`（完整 JSON）

### 4.4 活动模板数据（飞书 Base — Agent B 维护）

**Base Token**：`YXtcb43qOaTLLVsI1FGc1ZXFnUb`

| 表名 | Table ID | 字段数 | 记录数 | 用途 |
|------|----------|--------|--------|------|
| 活动模板表 | tblb3VeOmziHd6SJ | 19 | 532 | 标准活动定义 |
| 依赖关系表 | tbli5zBwZHiqmjIT | 5 | 0 | 活动间依赖（待填充） |
| 阀点定义表 | tblbEit1yZPEmhOv | 11 | 13 | G10~EOP 定义 |
| 甬道定义表 | tblhTrgNYilxOYQY | 6 | 33 | 泳道分类 |

---

## 五、认证与部署

### 5.1 飞书 OAuth 2.0 流程

```
用户点击登录 → 跳转飞书授权页
    ↓ code
Netlify Function (feishu-token.js) 换取 user_access_token
    ↓ token
前端存 localStorage，自动续期（5分钟窗口）
```

**Netlify Serverless Functions**（3个）：
- `feishu-token.js`：OAuth code → token
- `feishu-refresh.js`：刷新 token
- `feishu-api.js`：通用飞书 API 代理（避 CORS）

### 5.2 当前部署

- **平台**：Netlify（静态 + Functions）
- **地址**：https://project-planner-pmtools.netlify.app/
- **限制**：Netlify 域名不满足 HiAgent 同域要求

### 5.3 HiAgent 现状

- **本地可用**：通过 mkcert + hosts 映射 `https://limy24.x-peng.com`
- **线上不可用**：Netlify 域名不是 `*.x-peng.com`
- **当前 Agent**：计划小千（appKey: `d7aviaelvnd0kiio3vl0`，功能验证用）
- **后续**：等 @zhangy183 开发正式 agent，或迁移到飞书妙搭

---

## 六、Agent 团队协作

| 角色 | 职责 | 状态 |
|------|------|------|
| **Eliza** | 产品经理，需求决策 | — |
| **Agent A（CC）** | Web 应用 + Schema 主导 + plan-generator Skill | 🔧 开发 Skill |
| **Agent B** | 飞书 Base 建表 + 数据迁移 + 数据供给 | ✅ v2 完成 |
| **Agent C** | 待定（可能负责 HiAgent/前端优化） | 📋 未启动 |

**协作协议** v1.1：Schema 变更权归 A，通信通过 `_agent_comms/` 目录 markdown 文件。

---

## 七、迁移飞书妙搭的关注点

### 7.1 妙搭能解决的问题

| 当前痛点 | 妙搭方案 |
|----------|----------|
| HiAgent 同域 cookie 限制，部署受阻 | 飞书生态内嵌，无跨域问题 |
| 飞书 OAuth 需自建 Netlify Functions | 妙搭原生支持飞书身份，零开发认证 |
| 需要管理 APP_ID / APP_SECRET | 飞书应用体系内统一管理 |
| HiAgent token 消耗 | 妙搭提供免费内嵌 AI 对话 |

### 7.2 妙搭需要评估的能力

| 能力维度 | 需要确认 |
|----------|----------|
| 前端框架支持 | 是否支持 React 19 + Vite 7 + Konva 项目？ |
| Canvas 渲染 | Konva (HTML5 Canvas) 在妙搭环境中是否正常？ |
| 飞书多维表格 API | 妙搭内调用 Bitable API 的方式？权限模型？ |
| AI 对话能力 | 大模型质量（妙搭内置 vs HiAgent）？能否自定义 prompt？ |
| 自定义域名 | 是否支持 *.x-peng.com 子域名？ |
| 部署方式 | 如何构建+部署？CI/CD？ |
| IndexedDB | 妙搭容器是否支持 IndexedDB（Dexie）？ |
| 离线能力 | 离线使用 + 自动保存是否可行？ |
| 导出功能 | 文件下载（DrawIO XML / JSON / 图片）是否受限？ |

### 7.3 需要给妙搭的输入

1. **ProjectData JSON Schema** — 已在 README.md 定义，Agent 和网页的通信协议
2. **活动模板库表结构** — 4 张表，v2 版本，见 Section 四
3. **plan-generator Skill 逻辑** — 读模板 → 倒推排期 → 生成 JSON
4. **前端渲染逻辑** — Konva 画布 + 动态时间轴 + 泳道 + 节点 + 连接线
5. **当前代码仓库** — https://github.com/Lmy-eliza/pmtools

---

## 八、文件清单

### 核心源码
```
src/
├── main.tsx                         # 入口
├── App.tsx                          # 根组件（1093行）
├── index.css                        # 全局样式
├── types/index.ts                   # 全部 TypeScript 接口
├── stores/
│   ├── canvasStore.ts               # 主 Zustand store（517行）
│   └── authStore.ts                 # 飞书认证状态（95行）
├── hooks/
│   └── useCloudSync.ts              # 云端同步轮询+冲突检测
├── utils/
│   ├── storage.ts                   # Dexie DB + JSON 导入导出
│   ├── feishuApi.ts                 # 飞书 Bitable CRUD
│   ├── feishuAuth.ts                # OAuth 登录/登出/Token 管理
│   ├── dateUtils.ts                 # 日期↔像素转换，时间轴生成
│   ├── layoutEngine.ts             # 泳道自动高度+重叠避让
│   ├── criticalPath.ts             # 关键路径算法
│   ├── exportUtils.ts              # DrawIO XML 导出（662行）
│   └── statusUtils.ts              # 节点状态颜色映射
├── data/
│   └── presets.ts                   # 整车研发节点模板+颜色预设
└── components/
    ├── StatsBar.tsx                  # 状态统计栏
    ├── Auth/LoginButton.tsx          # 飞书登录按钮
    ├── Canvas/PlannerCanvas.tsx      # 主画布（1163行）
    ├── Toolbar/MainToolbar.tsx       # 顶部工具栏
    ├── Nodes/                        # 8种节点 + 连接线渲染
    └── Panels/                       # 7个功能面板
```

### 配置与部署
```
vite.config.ts                       # 构建配置（含条件式 HTTPS）
netlify.toml                         # Netlify 部署配置
netlify/functions/                   # 3个 Serverless Functions
index.html                           # 入口 HTML（含 HiAgent SDK）
```

### Agent 协作
```
_agent_comms/
├── PROJECT_BRIEF.md                 # 项目总览
├── AgentAB-协作协议-v1.1.md          # A/B 协作协议
├── A_to_B.md / B_to_A.md           # 双向通信记录
├── shared_state.md                  # 共享进度
└── HIAGENT_SDK_PROGRESS.md          # HiAgent 嵌入方案
```

### AI Skill
```
.claude/skills/plan-generator/
├── SKILL.md                         # Skill 定义
└── references/                      # 参考文档（Schema / 示例 / 模板）
```
