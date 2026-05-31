# Smart Planner — 团队协作协议
**项目**：Smart Planner（项目计划生成器）  
**通信路径**：`D:\claude_learning\project-planner\_agent_comms\`  
**版本**：v2.0 | 2026-05-27  
**前身**：Agent A/B 协作协议 v1.1（2026-05-25）

---

## 一、团队角色

### 固定角色

| 角色 | 身份 | 职责 |
|------|------|------|
| **Eliza** | 产品经理 / 决策者 / 领域专家 | 需求定义、设计决策、验收、领域知识输入 |

### Agent 团队

| Agent | 定位 | 核心职责 | 决策权 |
|-------|------|---------|--------|
| **A** | 主导方（架构 + Schema 所有者） | Web 应用架构、ProjectData JSON Schema 制定与维护、plan-generator Skill、画布渲染、数据消费侧 | Schema 格式、字段命名、数据校验规则、前端架构决策 |
| **B** | 数据供给方 | 飞书多维表格建表、标准活动模板维护、数据迁移脚本、平台调研 | 表结构实现方式、字段存储方式（输出必须符合 A 的 Schema） |
| **C** | 对话集成方 | AI 对话窗口 UI 组件开发、API 调用层、对话状态管理、对话与画布的数据桥接 | 对话组件内部实现方式（输出必须符合 A 的 ProjectData Schema，嵌入方式需 A 确认） |

**关键原则**：
- A 定义"数据长什么样"，B 负责"把数据组织好提供出来"，C 负责"让用户通过对话生成数据并导入画布"
- 新增 Agent 时，由 Eliza 指定其定位和职责边界，追加到本表

---

## 二、通信机制

### 目录结构

```
_agent_comms/
├── AgentAB-协作协议-v1.1.md    # 本文件（团队协作协议）
├── PROJECT_BRIEF.md             # 项目简报（任何 Agent 可更新）
├── shared_state.md              # 全局进度（任何 Agent 可更新自己负责的部分）
├── A_to_B.md / B_to_A.md        # A↔B 双向通信
├── A_to_C.md / C_to_A.md        # A↔C 双向通信
└── {X}_to_{Y}.md                # 未来新增的通信通道
```

### 通信文件命名规则

| 文件 | 用途 | 写入方 | 读取方 |
|------|------|--------|--------|
| `{X}_to_{Y}.md` | X 发给 Y 的需求、反馈、交付通知 | Agent X | Agent Y |
| `shared_state.md` | 全局进度同步、已确认决策 | 所有 Agent（各自更新各自部分） |
| `PROJECT_BRIEF.md` | 项目全局对齐、新人 Onboarding | 所有 Agent |

### 消息格式

每条消息以 `---` 分隔，包含时间戳和发送方标识，新消息**追加在文件末尾**，不删除历史：

```markdown
---
**[2026-05-27 16:30] C：**
消息内容
```

### 各 Agent 行为规范

**通用规则（适用于所有 Agent）：**

1. **开工前先读**：读取自己的收件通道（`{X}_to_我.md`）+ `shared_state.md`
2. **阶段性交付后写**：更新 `shared_state.md` 自己负责的部分 + 在通信文件中通知对方
3. **重大决策需 Eliza 确认**后才执行
4. **修改攒齐后一次性 commit + push**，不零散提交

**A 的额外规则：**
- Schema 变更权归 A，其他 Agent 不得自行修改 Schema
- 收到其他 Agent 的字段/接口变更请求，评估后在通信文件中回复确认或拒绝

**B 的额外规则：**
- 建表完成后在 `B_to_A.md` 中提供表名、Table ID、字段清单、与需求文档的差异说明
- 如需新增字段，先在通信文件中提出，等 A 确认后执行

**C 的额外规则：**
- 对话组件的嵌入位置、与画布的数据交互接口需 A 确认
- API 调用方案由 Eliza 提供，C 不自行选择 AI 服务商

---

## 三、新 Agent 加入流程

当 Eliza 决定引入新 Agent（如 D、E…）时：

1. **新 Agent 读** `PROJECT_BRIEF.md` → `shared_state.md` → 本协议
2. **Eliza 明确**：新 Agent 的定位、职责边界、与哪些 Agent 有通信需求
3. **创建通信文件**：`A_to_D.md` / `D_to_A.md`（按需创建，不是所有 Agent 都需要互相通信）
4. **更新本协议**：在"Agent 团队"表中追加角色
5. **更新 `shared_state.md`**：新增该 Agent 的进度 section
6. **新 Agent 发入队通知**：在对应通信文件中说明已读的内容、理解的分工边界、待确认的问题

---

## 四、Schema 与接口变更流程

> Schema 变更权归 A。其他 Agent 不得自行新增/修改/删除影响数据输出格式的字段或接口。

**其他 Agent 需要变更时：**
1. 在通信文件中向 A 提出：变更内容、类型、用途、理由
2. A 评估后回复确认或拒绝
3. 确认后执行，双方更新 `shared_state.md`

**A 变更 Schema 时：**
1. A 更新相关文档
2. A 在通信文件中通知受影响的 Agent
3. 受影响的 Agent 按通知调整

---

## 五、数据流全链路

```
Eliza 定义需求 + 提供领域知识
        │
        ▼
A 制定 ProjectData JSON Schema + 字段需求
        │
   ┌────┴────┐
   ▼         ▼
B 建飞书表   C 开发对话组件
录入模板数据   嵌入 Planner 网页
   │         │
   ▼         │
B 通知数据就绪 │
   │         │
   ▼         ▼
A 的 plan-generator    用户通过对话窗口
读取飞书表生成 JSON    描述需求 → API 生成 JSON
   │                    │
   └────────┬───────────┘
            ▼
   importFromJSON() → canvasStore.setState()
            │
            ▼
   Planner 画布渲染可视化
```

---

## 六、关键参考文档

| 文件 | 作用 | 维护者 |
|------|------|--------|
| `PROJECT_BRIEF.md` | 项目全局对齐 | 所有 Agent |
| `shared_state.md` | 进度同步 | 所有 Agent |
| `docs/ProjectData-JSON-Schema-v1.0.md` | JSON Schema 定义 | A |
| `src/types/index.ts` | TypeScript 类型定义 | A |
| `src/utils/storage.ts` | 导入/导出/验证函数 | A |
| `HIAGENT_SDK_PROGRESS.md` | HiAgent 方案记录（已验证但有限制） | B |

---

*本协议由 Eliza 授权，Agent C 从 v1.1 升级为团队通用版本。如有调整由发起方在通信文件中通知相关 Agent。*
