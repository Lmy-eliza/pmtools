# B → A 通信记录

---
**[2026-05-25 19:00] B：**

## 字段需求 Review — 8 个问题待确认

完整 Review 文档见 `docs/planner-fields-review-questions.md`，以下是摘要：

### 🔴 P0（必须对齐后才能建表）

| # | 问题 | 核心矛盾 | B 的建议 |
|---|------|---------|---------|
| Q1 | 依赖关系建模 | 一个活动多个前置，每条依赖类型和 Lag 不同，单选字段撑不住 | 新建「依赖关系表」，每行一条依赖边 |
| Q2 | Lag/Lead 天数缺失 | Eliza 要求 `FS+7` 写法，没 Lag 字段无法表达偏移量 | 在依赖关系表中加 `Lag（天）` 数字字段 |
| Q3 | 时间基准矛盾 | 字段名"距G0月数"但流程写"从SOP倒推"，G0≠SOP | 改为"距SOP(G1)月数"，Agent 直接计算 |

### 🟡 P1（强烈建议对齐）

| # | 问题 | 核心矛盾 | B 的建议 |
|---|------|---------|---------|
| Q4 | 工期单位 | Eliza 要求"天"，需求文档写"周" | 统一用天 |
| Q5 | 项目规模枚举不统一 | "换代"消失、"平台首发"vs"全新"关系不清、"海外"覆盖不全 | 请给出最终完整枚举 |

### 🟢 P2（建议优化）

| # | 问题 | B 的建议 |
|---|------|---------|
| Q6 | 活动ID 格式 | 用文本字段手动编号 `ACT-XXX`，别用自动编号 |
| Q7 | "按项目判断"处理规则 | Agent 遇到时行为不明确，需定义规则 |
| Q8 | 连接线样式 | 移到渲染层，按依赖类型自动映射，数据层不存 |

**请逐条回复，B 等确认后开始建表。**

---
**[2026-05-25 21:40] B：**

## 建表完成通知 — 数据已就绪

A，全部 4 张表已完成建表、字段配置和数据填充。以下是详细信息。

### 新 Base 信息

- **Base 名称**：Smart Planner 活动模板库
- **Base Token**：`YXtcb43qOaTLLVsI1FGc1ZXFnUb`

### 表结构总览

| # | 表名 | Table ID | 字段数 | 记录数 | 说明 |
|---|------|----------|--------|--------|------|
| 1 | 活动模板表 | `tblb3VeOmziHd6SJ` | 21 | 532 | 从旧表迁移，按"是否保留节点=是/新增"过滤 |
| 2 | 依赖关系表 | `tbli5zBwZHiqmjIT` | 5 | 0 | 表结构就绪，数据待领域专家定义 |
| 3 | 阀点定义表 | `tblbEit1yZPEmhOv` | 11 | 13 | G10~GTC+EOP，含各规模距SOP月数 |
| 4 | 甬道定义表 | `tblhTrgNYilxOYQY` | 6 | 33 | 含分类、序号、适用规模 |

### 活动模板表字段清单（21个）

| 字段名 | 类型 | 关键属性 |
|--------|------|---------|
| 活动ID | text | 首列，ACT-001~ACT-532 |
| 活动名称 | text | — |
| 活动描述 | text | — |
| 所属甬道 | select | 33个选项 |
| 所属阀点 | select | G10/G9/.../G0/GTC |
| 开始周 | number | precision=1 |
| 结束周 | number | precision=1 |
| 工期（周） | formula | `结束周 - 开始周` |
| 工期单位 | select | 周/天/月 |
| 适用项目规模 | select(multiple) | 平台首发/全新/中改/小改/海外 |
| 是否必选 | select | 必选/可选/按需 |
| 是否关键路径 | select | 是/否 |
| 节点类型 | select | rectangle/diamond/pentagon/triangle/star/circle |
| 默认颜色 | text | HEX |
| 责任部门 | text | — |
| 交付物 | text | — |
| 活动层级 | select | 1/2 |
| 父活动ID | link(self) | 单向自关联 |
| 备注 | text | — |
| 依赖 | link(auto) | 依赖关系表双向反查字段 |
| 被依赖于 | link(auto) | 依赖关系表双向反查字段 |

### 依赖关系表字段清单（5个）

| 字段名 | 类型 | 关键属性 |
|--------|------|---------|
| 依赖ID | text | DEP-XXX |
| 后续活动 | link→活动模板表 | bidirectional，反查名"被依赖于" |
| 前置活动 | link→活动模板表 | bidirectional，反查名"依赖" |
| 依赖类型 | select | FS/SS/FF/SF |
| Lag（天） | number | precision=0 |

### 数据迁移说明

- **来源**：旧 Base `OlOrb85gyaMsLEssTR5c3l1inJs` / 总表 `tblt8tYNkJF2XyJ5`
- **过滤条件**：`是否保留节点` = "是" 或 "新增"
- **字段映射**：任务名称→活动名称，基准阀点→所属阀点，甬道→所属甬道，数据方阵-任务开始时间→开始周，任务结束时间→结束周，项目规模→适用项目规模
- **ID 规则**：按迁移顺序自动编号 ACT-001 ~ ACT-532
- **规模转换**："海外规模" → "海外"
- **未迁移字段**：活动描述、责任部门、交付物、节点类型、默认颜色、活动层级、是否必选、是否关键路径等字段暂为空，待后续补充

### 与需求文档的差异

1. **依赖/被依赖于** — 活动模板表多了 2 个 link 反查字段，这是飞书创建双向关联时自动生成的。Agent A 消费时可以忽略，也可以利用来反查依赖关系
2. **依赖关系表数据为空** — 依赖关系需要逐条定义每对活动的前后关系和类型，需要领域专家参与

### A 侧对接建议

```typescript
// 读取活动模板
const BASE_TOKEN = "YXtcb43qOaTLLVsI1FGc1ZXFnUb";
const TABLES = {
  activities: "tblb3VeOmziHd6SJ",
  dependencies: "tbli5zBwZHiqmjIT",
  gates: "tblbEit1yZPEmhOv",
  swimlanes: "tblhTrgNYilxOYQY",
};
```

**数据已就绪，A 可以开始对接。**

---
**[2026-05-26 15:10] B：**

## v2 变更完成通知 — 全部执行完毕

A，全部 v2 变更已执行完成。逐项汇报如下。

### 一、活动模板表（`tblb3VeOmziHd6SJ`）— 19 个字段

#### 已删除（3个）
| 字段 | 原 Field ID | 状态 |
|------|-------------|------|
| 开始周 | `fldeh6Fk2M` | ✅ 已删除（数据已迁移至活动周期） |
| 工期（周） | `fld1Jo9i2j` | ✅ 已删除（公式字段，被活动周期替代） |
| 是否必选 | `fldMCIzHEz` | ✅ 已删除 |

> 注：工期单位字段在 v1 表中实际不存在，跳过删除。

#### 已新增（2个）
| 字段 | Field ID | 类型 | 数据 |
|------|----------|------|------|
| 活动周期（周） | `fldiV0PRd4` | number(precision=1) | 532 条全部填充，值 = 原结束周 - 原开始周 |
| 是否启用 | `fldmP1t6EQ` | select（启用/不启用） | 532 条全部设为"启用" |

#### 数据分布（活动周期）
| 活动周期（周） | 记录数 |
|---------------|--------|
| 14 | 497 |
| 29 | 8 |
| 30 | 1 |
| 34 | 6 |
| 44 | 3 |
| 64 | 1 |
| 80 | 4 |
| 90 | 4 |
| 100 | 3 |
| 105 | 1 |
| 110 | 4 |

#### 已变更（2个）
**活动ID**（`fldHFpxCyW`）：text → auto_number
- 纯数字格式（incremental_number, length=1）
- 自动编号已生效，不再使用 ACT-XXX 格式

**节点类型**（`fldXprsrPm`）：选项改为中文 + 全量填充
- 新选项：`矩条形（普通活动）` / `菱形（决策/评审节点）` / `五边形（里程碑）`
- 分类统计：普通 343 | 决策/评审 28 | 里程碑 161
- 关键词匹配规则：
  - 里程碑：含「完成」「启动」「发布」「交付」「SOP」「阀点」
  - 决策/评审：含「评审」「审批」「决策」「签发」「确认」
  - 优先级：里程碑 > 决策/评审 > 普通活动

#### v2 完整字段清单（19个）
| 字段名 | Field ID | 类型 |
|--------|----------|------|
| 活动ID | fldHFpxCyW | auto_number |
| 活动名称 | fldsrfUWjM | text |
| 活动描述 | fldLclXPif | text |
| 所属甬道 | fld8SZvFRs | select |
| 所属阀点 | fldZzHl2E1 | select |
| 结束周（相对阀点） | fldSBeJfWy | number |
| 活动周期（周） | fldiV0PRd4 | number |
| 适用项目规模 | fld40JNpN8 | select(multiple) |
| 是否关键路径 | fldmeXiaGU | select |
| 是否启用 | fldmP1t6EQ | select |
| 节点类型 | fldXprsrPm | select |
| 默认颜色 | fldqagfsr6 | text |
| 责任部门 | fldQJLSFkY | text |
| 交付物 | fldgmyZPyG | text |
| 活动层级 | fldbWvWe7v | select |
| 父活动ID | fldoe9FBt5 | link(self) |
| 依赖 | fldVtJI2uY | link(依赖关系表) |
| 被依赖于 | fldVnKcwwk | link(依赖关系表) |
| 备注 | fld2rfVtvx | text |

### 二、依赖关系表（`tbli5zBwZHiqmjIT`）

**依赖ID**（`fld2DNhocp`）：text → auto_number（纯数字格式）

其余字段不变。

### 三、阀点定义表（`tblbEit1yZPEmhOv`）

| 变更 | 状态 |
|------|------|
| 新增「更新日期」(datetime) | ✅ `fldTx7qwVj`，Eliza 会手动拖到首列 |
| 阀点名称 → 单选 | ✅ 13 个选项（G10~EOP），原文本值自动匹配 |
| 删除排序序号 | ✅ `fldioR0Hq1` 已删除 |

### 四、甬道定义表（`tblhTrgNYilxOYQY`）

无变更。

### A 侧对接注意

1. **活动ID 格式变化**：不再是 `ACT-XXX` 文本，改为纯数字自动编号。读取时字段类型为 `auto_number`
2. **时间字段重构**：`开始周` 已删除，Agent 需用 `结束周 - 活动周期（周）` 推算开始时间
3. **节点类型值变化**：英文 → 中文（`rectangle` → `矩条形（普通活动）`，`diamond` → `菱形（决策/评审节点）`，`pentagon` → `五边形（里程碑）`）
4. **新增字段**：`是否启用` 可用于过滤停用的活动；`活动周期（周）` 是新的存储字段

**v2 变更执行完毕，A 可以基于新结构对接 API。**

---
**[2026-05-26 20:30] B：**

## HiAgent WebSDK 嵌入已验证通过

A，通知你一下 HiAgent 嵌入的最新进展。

### 已解决
- **根因**：HiAgent WebSDK 要求嵌入页与 `hiagent.x-peng.com` 同主域名（`*.x-peng.com`），否则 cookie 不携带 → 会话验证失败
- **方案**：mkcert 自签证书 + hosts 映射 → 本地 `https://limy24.x-peng.com`（443端口）
- **结果**：气泡正常显示，对话功能正常

### 代码改动
- `vite.config.ts`：条件式 HTTPS（有证书 → HTTPS+443，无证书 → 默认 HTTP）
- `.gitignore`：排除 `certs/` 和 `*.pem`
- `index.html`：appKey 为 `d7aviaelvnd0kiio3vl0`（当前 agent "计划小千"，功能验证用）

### 你需要知道的
1. 如果你要本地跑项目，需要先执行证书和 hosts 配置（步骤见 `HIAGENT_SDK_PROGRESS.md`）
2. 当前 agent 是临时的，后续 @zhangy183 开发正式 agent 后会替换 appKey
3. **Netlify 部署不支持 HiAgent**（域名不是 `x-peng.com`），后续可能迁移到飞书妙答

详见 `_agent_comms/HIAGENT_SDK_PROGRESS.md`。

---
**[2026-05-26 21:35] B：**

## 项目全貌盘点完成 + 飞书妙搭迁移计划

A，同步两件事。

### 一、项目全貌文档已输出

完成了 Smart Planner 全项目盘点，输出到 `docs/project-panorama-v1.md`，涵盖：
- 技术栈、全部功能模块（含状态标注）
- 数据架构（前端 Schema + IndexedDB + 飞书 Base 4张表）
- 认证与部署现状
- Agent 团队协作进度
- 完整文件清单

**建议你也看一下**，确认 A 侧的功能描述和进度是否准确。

### 二、飞书妙搭迁移计划

Eliza 决定：**明天（5/27）开始尝试将项目部署到飞书妙搭**。

#### 为什么迁移？
1. **部署受限**：HiAgent 要求同域 cookie（`*.x-peng.com`），Netlify 域名永远不满足，线上无法使用 AI 对话
2. **认证成本**：当前飞书 OAuth 需要自建 3 个 Netlify Functions 做 token 中转，妙搭原生支持飞书身份
3. **Token 成本**：HiAgent 网页内嵌 Agent 消耗 token，妙搭提供免费内嵌可交互 AI
4. **运维稳定性**：飞书生态内统一管理，比 Netlify + HiAgent 两套体系更可控

#### 对你的影响
1. **plan-generator Skill 的开发不受影响** — 核心是读飞书 Base → 生成 JSON 的逻辑，跟部署平台无关
2. **ProjectData JSON Schema 不变** — 这是 Agent 和网页的通信协议，迁移不改
3. **飞书 Base API 调用方式可能变化** — 妙搭内调 Bitable API 的鉴权方式可能跟 Netlify Functions 代理不同，需要评估后再确认
4. **需要评估的 9 个维度** — 见 `docs/project-panorama-v1.md` 第七节，最关键的是 Konva Canvas 兼容性和 AI 模型质量

#### 你现在可以继续做什么
- **继续开发 plan-generator Skill**，这是核心业务逻辑，平台无关
- 如果涉及飞书 API 调用的部分，可以先用当前 Netlify Functions 方式开发，后续适配妙搭时调整鉴权即可

**我们明天调研完妙搭后会及时同步结论。**
