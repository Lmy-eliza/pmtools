# 共享状态 | 最后更新：2026-05-26 21:35 by B

## A 侧进度
- [x] 字段需求文档输出（docs/planner-database-fields-requirement.md）
- [x] ProjectData JSON Schema v1.0 发布
- [x] Q1-Q8 全部回复完毕
- [x] v1 建表验收通过
- [x] **v2 字段优化需求**：Eliza 逐字段审查，8 项决策达成共识，变更需求已发给 B
- [ ] plan-generator Skill 对接多维表格 API（等 B 完成 v2 变更后启动）

## B 侧进度
- [x] Review 字段需求文档，提出 8 个问题（docs/planner-fields-review-questions.md）
- [x] 等待 A 回复 Q1-Q8 → **A 已回复，可以建表**
- [x] 新建 Base "Smart Planner 活动模板库"（`YXtcb43qOaTLLVsI1FGc1ZXFnUb`）
- [x] 活动模板表建表（21字段，532条记录迁移完成）→ `tblb3VeOmziHd6SJ`
- [x] 依赖关系表建表（5字段，数据待领域专家定义）→ `tbli5zBwZHiqmjIT`
- [x] 阀点定义表建表（11字段，13条记录）→ `tblbEit1yZPEmhOv`
- [x] 甬道定义表建表（6字段，33条记录）→ `tblhTrgNYilxOYQY`
- [x] 标准活动数据迁移（旧表→新表，过滤后532条）
- [x] 验证字段结构 + 数据完整性
- [x] 通知 Agent A 数据就绪（B_to_A.md）
- [x] **v2 变更执行完成**（2026-05-26 15:10）：活动模板表（删3实际/加2/改2 → 19字段）+ 依赖表ID改自动编号 + 阀点定义表（加更新日期/阀点名称改单选/删排序序号）
- [x] 通知 Agent A v2 变更完成（B_to_A.md）

## 已确认问题（Q1-Q8，5/25）
- [x] Q1：依赖关系拆表 → 接受，新建依赖关系表
- [x] Q2：Lag 字段 → 放在依赖关系表中
- [x] Q3：时间锚点 → 维持 G0（G0=SOP），B 原理解有误
- [x] Q4：工期单位 → 维持周，可加公式字段换算天
- [x] Q5：项目规模枚举 → 平台首发/全新/中改/小改/海外（5个）
- [x] Q6：活动ID → 文本字段，手动编号 ACT-XXX
- [x] Q7：是否关键路径 → 简化为 是/否，删除"按项目判断"
- [x] Q8：连接线样式 → 从数据层移除，渲染层按依赖类型自动映射

## v2 字段优化决策（5/26，Eliza 逐字段审查）
- [x] #1：时间字段重构 → 保留结束周（锚点），新增活动周期（数字），删除开始周（Agent推算）
- [x] #2：一条记录 = 一个活动实例，不合并跨阀点活动
- [x] #3：删除"是否必选"，由"适用项目规模"多选替代
- [x] #4：保留"活动层级"（0=阀点，1=一级，2=二级）+ 父活动ID
- [x] #5：保留依赖关系表 + 关联字段（放弃文本正则方案）
- [x] #6：节点类型改中文选项，按关键词规则批量填充
- [x] #7：阀点定义表加"更新日期"首列，阀点名称改单选，排序序号待评估
- [x] #8：新增"是否启用"字段（软删除）
- [x] 活动ID → 自动编号纯数字（取代 ACT-XXX）
- [x] 所属阀点跨表引用 → Eliza 手动配置，B 不处理

## HiAgent WebSDK 嵌入进度（5/26 ✅ 已验证通过）
- [x] 问题定位：气泡正常但点击后白屏转圈
- [x] **根因确认（官方客服）**：WebSDK 要求嵌入页与 hiagent.x-peng.com 同主域名，否则 cookie 无法携带
- [x] 方案：mkcert 自签证书 + hosts 映射 → 本地 `https://limy24.x-peng.com`
- [x] 代码改动：vite.config.ts 条件式 HTTPS + HMR 配置 + .gitignore
- [x] mkcert 安装 + 证书生成 + hosts 配置 + HiAgent 白名单
- [x] **本地验证通过**：气泡正常、对话正常
- 当前 agent: 计划小千（appKey: `d7aviaelvnd0kiio3vl0`，功能验证用）
- 后续：@zhangy183 开发正式 agent 后替换 appKey；考虑迁移到飞书妙答解决部署问题
- 详见 `_agent_comms/HIAGENT_SDK_PROGRESS.md`

## 飞书妙搭迁移计划（5/26 Eliza 决策，5/27 开始调研）
- **动机**：HiAgent 部署受限（同域 cookie）+ 认证成本 + Token 成本 + 运维稳定性
- **影响范围**：部署平台 + 认证方式 + AI 对话载体；ProjectData Schema 和 plan-generator 核心逻辑不变
- **项目全貌文档**：`docs/project-panorama-v1.md`（含迁移评估 9 个维度）
- [ ] 5/27 调研妙搭能力边界（Konva 兼容性、AI 模型质量、Bitable API 鉴权方式）
- [ ] 调研结论同步 A

## 已确认约定
- 字段命名以 A 的需求文档为准
- 旧 Base Token: `OlOrb85gyaMsLEssTR5c3l1inJs`，旧总表: `tblt8tYNkJF2XyJ5`（仅供参考，不再使用）
- **新 Base Token: `YXtcb43qOaTLLVsI1FGc1ZXFnUb`**
- 活动模板表: `tblb3VeOmziHd6SJ` | 依赖关系表: `tbli5zBwZHiqmjIT` | 阀点定义表: `tblbEit1yZPEmhOv` | 甬道定义表: `tblhTrgNYilxOYQY`
- 建表清单：活动总表 + 依赖关系表（新增）+ 阀点定义表 + 甬道定义表 = 4张表
- 项目规模枚举：平台首发 / 全新 / 中改 / 小改 / 海外
- "换代"="全新"，不单独设枚举值
