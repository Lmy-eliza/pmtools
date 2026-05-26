# Agent A/B 协作协议
**项目**：Smart Planner（项目计划生成器）  
**通信路径**：`D:\claude_learning\project-planner\_agent_comms\`  
**版本**：v1.1 | 2026-05-25

---

## 一、角色分工

| | Agent A | Agent B |
|---|---------|---------|
| **定位** | 主导方（Web 应用 + Schema 所有者） | 协作方（数据库建设 + 数据供给） |
| **职责** | Web 应用开发、ProjectData JSON Schema 制定与维护、计划生成 Skill 开发、数据消费侧 | 多维表格数据库搭建、标准活动模板录入与维护、数据供给侧 |
| **决策权** | Schema 格式、字段命名、数据校验规则由 A 定义 | 表结构实现方式、字段存储方式由 B 自行决定，但输出必须符合 A 的 Schema |

**关键原则**：B 的工作产出最终要被 A 消费。A 定义"我需要什么格式的数据"，B 负责"怎么把数据组织好并提供出来"。

---

## 二、目录结构约定

```
D:\claude_learning\project-planner\
├── _agent_comms\
│   ├── A_to_B.md          # A 写 → B 读（数据需求、字段变更通知、问题反馈）
│   ├── B_to_A.md          # B 写 → A 读（建表进度、数据就绪通知、疑问）
│   └── shared_state.md    # 双方共同维护（当前进度、待确认问题）
└── ...其他项目文件
```

### 文件写入规则

- 每条消息以 `---` 分隔，包含时间戳和发送方标识
- 新消息**追加在文件末尾**，不删除历史消息
- 格式：

```markdown
---
**[2026-05-25 16:30] A：**
消息内容
```

---

## 三、Schema 引用（只读）

B 不参与 Schema 制定，但需要理解 Schema 以确保数据库字段能正确映射。

**Schema 参考文档（B 只读，不可修改）**：
- 完整定义：`project-planner/README.md`
- 技术细节：`project-planner/.claude/skills/plan-generator/references/project-data-schema.md`
- 生成示例：`project-planner/.claude/skills/plan-generator/references/plan-generation-examples.md`

**数据库字段需求文档（A 提供给 B 的建表依据）**：
- `docs/planner-database-fields-requirement.md`

B 建表时以字段需求文档为准。如有字段疑问，写入 `B_to_A.md` 向 A 确认。

---

## 四、通信规则

### Agent A 的行为规范

```
写入：A_to_B.md（数据字段需求、Schema 变更通知、问题反馈）
读取：B_to_A.md（获取 B 的建表进度、疑问）
```

A 在以下节点主动写入 `A_to_B.md`：
1. 新增/修改/删除字段需求时
2. 发现 B 提供的数据与 Schema 不匹配时
3. 需要 B 补充数据或调整表结构时

### Agent B 的行为规范

```
写入：B_to_A.md（建表进度、数据就绪通知、字段疑问）
读取：A_to_B.md（获取 A 的最新需求）
```

**B 每次开始工作前，执行以下检查：**
1. 读取 `A_to_B.md`，确认有无新的字段需求或变更
2. 读取 `shared_state.md`，确认当前进度
3. 完成阶段性工作后，更新 `shared_state.md` 的 B 侧进度

**B 完成建表后，在 `B_to_A.md` 中通知 A：**
- 表名、表 ID（Base Token + Table ID）
- 已录入的数据条数
- 与需求文档的差异说明（如有）

---

## 五、数据流全链路

```
A 提供字段需求文档
        │
        ▼
B 在飞书多维表格建表 + 录入标准活动数据
        │
        ▼
B 通知 A 数据就绪（B_to_A.md）
        │
        ▼
A 的 plan-generator Skill 读取多维表格
        │
        ▼
A 基于用户输入（项目名、规模、SOP日期）倒排生成 ProjectData JSON
        │
        ▼
用户在 Smart Planner Web 应用中导入 JSON → 画布可视化
```

---

## 六、字段变更流程

> Schema 变更权归 A。B 不得自行新增/修改/删除影响数据输出格式的字段。

**B 需要新增字段时：**
1. B 在 `B_to_A.md` 中提出：字段名、类型、用途、理由
2. A 评估后在 `A_to_B.md` 中回复确认或拒绝
3. 确认后 B 执行变更，双方更新 `shared_state.md`

**A 变更字段需求时：**
1. A 更新 `docs/planner-database-fields-requirement.md`
2. A 在 `A_to_B.md` 中通知 B 变更内容
3. B 按通知调整表结构

---

## 七、shared_state.md 模板

```markdown
# 共享状态 | 最后更新：[时间] by [A/B]

## A 侧进度
- [x] 字段需求文档输出（docs/planner-database-fields-requirement.md）
- [x] ProjectData JSON Schema v1.0 发布
- [ ] plan-generator Skill 对接多维表格 API

## B 侧进度
- [ ] 活动总表建表（目标：22个字段）
- [ ] 阀点定义表建表（目标：11个字段）
- [ ] 甬道定义表建表（目标：6个字段）
- [ ] 标准活动数据录入

## 待确认问题
- [ ] （B 提问 → A 回答）

## 已确认约定
- 字段命名以 A 的需求文档为准
- 多维表格 Base Token / Table ID 由 B 建表后提供给 A
```

---

*本协议由 Agent A 制定。如有调整由 A 在 `A_to_B.md` 中通知 B。*
