# Smart Planner — Agent Team 项目简报

> **最后更新**：2026-05-26 by B
> **阅读对象**：Agent A / B / C 及任何新加入的 Agent

---

## 1. 项目背景

**Smart Planner** 是一个面向整车研发的项目计划自动生成工具。产品经理 Eliza（小鹏汽车）需要一套系统：

> 用户输入 **项目名称 + 车型规模 + SOP日期** → Agent 从飞书多维表格读取标准活动模板 → 自动倒排生成项目计划 JSON → 导入 Web 画布渲染为甘特图/泳道图

**核心价值**：消除传统手工排计划的重复劳动（每个新车型 500+ 活动、多阀点、多甬道），让 PM 专注于决策而非排版。

### 技术栈

| 层 | 技术 |
|----|------|
| 数据层 | 飞书多维表格（Base），4 张表，通过 lark-cli API 读写 |
| 计算层 | plan-generator Agent Skill（读飞书表 → 计算时间 → 输出 JSON） |
| 展示层 | React 19 + TypeScript + Vite 7 + Konva/react-konva 画布 |
| 状态管理 | Zustand 5 + Dexie (IndexedDB) 本地持久化 |
| 部署 | Netlify → https://project-planner-pmtools.netlify.app/ |
| 代码仓库 | https://github.com/Lmy-eliza/pmtools (master) |

---

## 2. 项目目标

### 近期目标（3天 Demo）

**跑通"全新"车型标准主计划端到端 Demo**：
1. A 验收 B 的 v2 表结构 → 对接 plan-generator Skill 读飞书 API
2. A 开发 JSON 生成逻辑（时间倒排 + 节点坐标计算）
3. 输出 ProjectData JSON → 手动粘贴导入 planner 网站验证

### 中期目标

- 自动导入（无需手动粘贴）
- 依赖关系数据填充 → 连接线渲染
- HiAgent 气泡对话集成（当前无法加载）
- 多规模支持（中改/小改/海外）

---

## 3. 数据结构（v2，2026-05-26）

```typescript
const BASE_TOKEN = "YXtcb43qOaTLLVsI1FGc1ZXFnUb";
const TABLES = {
  activities: "tblb3VeOmziHd6SJ",    // 活动模板表 (19字段, 532记录)
  dependencies: "tbli5zBwZHiqmjIT",  // 依赖关系表 (5字段, 0记录)
  gates: "tblbEit1yZPEmhOv",         // 阀点定义表 (11字段, 13记录)
  swimlanes: "tblhTrgNYilxOYQY",     // 甬道定义表 (6字段, 33记录)
};
```

### 活动模板表（19 字段）

活动ID(auto_number) / 活动名称 / 活动描述 / 所属甬道 / 所属阀点 / 结束周（相对阀点） / 活动周期（周） / 适用项目规模 / 是否关键路径 / 是否启用 / 节点类型 / 默认颜色 / 责任部门 / 交付物 / 活动层级 / 父活动ID(link) / 依赖(link) / 被依赖于(link) / 备注

### 关键设计决策

| 编号 | 决策 | 要点 |
|------|------|------|
| Q1 | 依赖关系拆独立表 | 一对多依赖 + 独立类型(FS/SS/FF/SF) + Lag |
| Q3 | G0 = SOP | 量产启动，GTC 才是质量确认 |
| Q4 | 工期单位 = 周 | 项目管理自然语言，Agent 计算时 ×7 转天 |
| v2-#1 | 时间字段重构 | 锚定结束周，活动周期单独存储，开始由 Agent 推算 |
| v2-#6 | 节点类型中文化 | 矩条形 343 / 菱形 28 / 五边形 161 |
| v2-#8 | 软删除 | "是否启用"字段替代物理删除 |

### 节点类型映射

| 飞书表值 | JSON type | ProjectData 行为 |
|---------|-----------|-----------------|
| 矩条形（普通活动） | rectangle | 有 width、startDate、endDate |
| 菱形（决策/评审节点） | diamond | 无 width |
| 五边形（里程碑） | pentagon | 无 width |

### 项目规模枚举

平台首发 / 全新 / 中改 / 小改 / 海外

---

## 4. Agent 团队

```
Eliza（产品经理 / 决策者 / 领域专家）
   ↕ 直接对话
Agent A（plan-generator Skill / 架构设计 / JSON 生成）
   ↕ _agent_comms/ 通信文件
Agent B（飞书多维表格建表 / 数据供给 / 迁移脚本）
   ↕ _agent_comms/ 通信文件
Agent C（待定，视 HiAgent 排查结果启用）
```

### 各 Agent 职责

| Agent | 核心职责 | 工具能力 | 当前状态 |
|-------|---------|---------|---------|
| **A** | 消费数据：定义 Schema、开发 plan-generator Skill、生成 ProjectData JSON、画布渲染逻辑 | Claude Code + plan-generator Skill + 飞书 API 读取 | 🔵 进行中：验收 v2 → 对接飞书 API → JSON 生成 |
| **B** | 供给数据：建表、字段管理、数据迁移、批量更新、表结构维护 | Claude Code + lark-cli base 全套命令 + Node.js 脚本 | ✅ v2 变更完成，待 A/Eliza 分配下一步 |
| **C** | 待定：可能负责 HiAgent webSDK 集成、前端 UI 优化 | 待定 | ⏸ 暂未启用 |

### 通信协议

| 文件 | 用途 | 规则 |
|------|------|------|
| `A_to_B.md` | A 发给 B 的需求、反馈、验收 | A 写，B 读 |
| `B_to_A.md` | B 发给 A 的交付通知、技术细节 | B 写，A 读 |
| `shared_state.md` | 双方进度同步、已确认决策 | A/B 均可更新 |
| `PROJECT_BRIEF.md` | 本文件，项目全局对齐 | 任何 Agent 可更新 |

**新 Agent 加入时**：先读 `PROJECT_BRIEF.md`（本文件），再读 `shared_state.md` 了解进度，再读自己相关的通信文件。

---

## 5. 当前进展

### ✅ 已完成

| 日期 | 里程碑 | 执行者 |
|------|--------|--------|
| 5/25 | v1 建表：4 张表建立、532 条活动数据迁移 | B |
| 5/25 | Q1-Q8 设计决策全部对齐 | A + B |
| 5/25 | v1 验收通过 | A |
| 5/26 | v2 字段优化：删3/加2/改2 + 节点类型填充 + 阀点表调整 | B |
| 5/26 | Eliza 手动配置跨表引用（所属阀点 → 阀点定义表） | Eliza |

### 🔵 进行中

| 任务 | 负责人 | 依赖 |
|------|--------|------|
| plan-generator Skill 对接飞书 Base API | A | v2 表结构（已完成） |
| Demo JSON 生成 + 导入验证 | A | 上一步完成后 |

### 📋 待办

| 任务 | 负责人 | 优先级 |
|------|--------|--------|
| 人工修正节点类型分类（关键词匹配不精确的部分） | Eliza | 🟡 |
| 依赖关系数据填充 | Eliza + B | 🟡 Demo 后 |
| HiAgent webSDK 对话气泡排查 | C 或 A | 🟡 |
| 连接线渲染（依赖关系可视化） | A | ⚪ 依赖数据填充后 |
| 自动导入（替代手动粘贴 JSON） | A | ⚪ Demo 跑通后 |

---

## 6. 关键文件索引

| 文件 | 作用 |
|------|------|
| `_agent_comms/PROJECT_BRIEF.md` | 本文件，项目全局对齐 |
| `_agent_comms/A_to_B.md` | A→B 通信（需求、Q1-Q8、v2 需求） |
| `_agent_comms/B_to_A.md` | B→A 通信（建表通知、v2 完成通知） |
| `_agent_comms/shared_state.md` | 进度同步 |
| `.claude/skills/plan-generator/SKILL.md` | Skill 定义（A 维护） |
| `.claude/skills/plan-generator/references/automotive-wbs-template.md` | WBS 模板参考 |
| `.claude/skills/plan-generator/references/project-data-schema.md` | JSON Schema 参考 |
| `src/utils/storage.ts` | 网站导入函数（importFromJSON, validateProjectJSON） |
| `src/types/index.ts` | TypeScript 类型定义 |
| `index.html` | HiAgent SDK 嵌入位置 |

---

## 7. 给新 Agent 的 Onboarding

1. **读本文件**：了解项目全貌、团队分工、数据结构
2. **读 `shared_state.md`**：了解当前进度和已确认的决策
3. **确认你的职责**：Eliza 会在你加入时明确你的角色和任务边界
4. **通信规则**：
   - 用 `_agent_comms/` 下的 .md 文件与其他 Agent 通信
   - 写入前先读最新内容，追加到末尾，标注时间和发送者
   - 重大决策需 Eliza 确认后才执行
5. **飞书操作**：使用 `lark-cli base +...` 命令，操作前必读对应 reference
6. **代码变更**：修改攒齐后一次性 commit + push + deploy，不零散提交
