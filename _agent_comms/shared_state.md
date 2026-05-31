# 共享状态 | 最后更新：2026-05-31 by C（ChatPanel AI 优化完成）

## A 侧进度
- [x] 字段需求文档输出（docs/planner-database-fields-requirement.md）
- [x] ProjectData JSON Schema v1.0 发布
- [x] Q1-Q8 全部回复完毕
- [x] v1 建表验收通过
- [x] **v2 字段优化需求**：Eliza 逐字段审查，8 项决策达成共识，变更需求已发给 B
- [x] **plan-generator 核心脚本完成**（2026-05-27）：`scripts/generate-plan.mjs`
  - lark-cli 读表 → 按车型筛选 → 倒排计算 → ProjectData JSON
  - 全新：12 阀点 + 84 活动 = 96 节点 | 平台首发：12 阀点 + 446 活动 = 458 节点
  - 支持全部 5 种车型规模，JSON 通过 planner 导入校验
- [x] SKILL.md 升级 v1.1：新增脚本模式
- [x] **画布性能优化 + 节点修正**（2026-05-27，含 Codex review 反馈）：
  - 修复活动节点类型映射（pentagon → diamond）
  - 导入端归一化兼容旧 JSON
  - 移除 PlannerCanvas hover tooltip（消除 O(n) 扫描 + 高频 re-render）
  - RectangleNode 移除 hover 态，默认态内联日期显示 + ellipsis 防拥挤
- [x] **方案 D 泳道架构重构 Day 1**（2026-05-27）：消灭 scroll re-render
  - 删除 `scrollY` useState，改用 `scrollYRef`（纯 ref，零 re-render）
  - 覆盖层从条件渲染 `{scrollY > 0 && ...}` 改为始终挂载 `visible={false}`
  - scroll handler 纯命令式：`frozenGroupRef.y()` + `.visible()` + `.batchDraw()`
- [x] **方案 D 泳道架构重构 Day 2**（2026-05-28）：单滚动容器 + sticky left rail
  - 左右分离的双滚动容器 → 单一 `overflow: auto` 容器
  - 左侧 rail `position: sticky; left: 0`（水平滚动时固定在左边）
  - 项目名称 `sticky; top: 0` + 冻结标签 `sticky; top: headerH`（垂直滚动时固定）
  - 删除 `swimlaneListRef` + JS scroll sync，泳道名称与画布天然同源滚动
- [x] **回复 D 的 3 个需求**（2026-05-28）：
  - 级联影响 + 风险分析 prompt-driven demo（G5 延后 15 天场景）→ D 可直接更新文档
  - Chat 解析飞书文档：5/31 前不可行，推荐 prompt 引导方案
  - Step 4 排期确认：已完成（prompt-driven，不写新代码）
- [x] **URL 参数切换**（2026-05-28）：`?mode=hiagent` / `?mode=chatpanel` 控制两套方案显示
- [x] **给 B 下发 plan-edit skill 需求**（2026-05-28）：B 已空闲，立即开始
- [x] **给 C 下发 skill 集成任务**（2026-05-28）：等 B 交付 skill 后集成
- [x] **确认 B 的 plan-edit skill 交付**（2026-05-28 17:30）：v1.1.0 收到，通知 C 开始集成
- [x] **确认日期计算口径**（2026-05-28）：`月数 × 30天`，plan-generator 和 plan-editor 统一
- [x] **基线 commit**（2026-05-28 18:10）：`927446e`，61 文件 +8237 行，作为安全回退点
- [x] **Codex 性能优化讨论**（2026-05-28）：确认 7 步低风险优化清单，大架构改造放赛后
- [x] **回复 D 打包交付清单**（2026-05-28 18:30）：4 个确认 + 赛后优化路线图素材
- [ ] **画布性能微调**（今天/明天）：按 Codex 建议从低风险开始，修 build → 加索引 → 局部 selector
- [ ] ~~方案 D Day 3~~：冻结整行体验（赛后目标，现有功能够用）
- [ ] ~~方案 D Day 4~~：稳定性 + 458 节点压力测试（赛后目标）
- [ ] Eliza 录屏 v1（今天）→ 验证 Demo 端到端

## 🔴 5/29 最终冲刺日作战计划

### 关键时间线
- **5/29（今天）**：核心交付日，主体工作必须今天完成
- **5/30-31（周末）**：Eliza 有 VPN 可用 AI 工具，但不加班——仅作为最终审阅和提交的备用窗口
- **初赛入选率约 1/3**（2万+ 赛题，3 个赛道），过了初赛后可持续优化

### 今日任务分配

| 角色 | 任务 | 优先级 | 状态 |
|------|------|--------|------|
| **A** | 1. 下发各 Agent 今日任务 ✅ | 🔴 | ✅ |
| | 2. API Key 配置 + ChatPanel 试跑 | 🔴 | ✅ MiniMax M2.5 验证通过 |
| | 3. 画布性能微调（如时间允许） | 🟢 | ⏳ |
| **B** | 1. 审查曹大林历史项目数据 | 🔴 | ⏳ |
| | 2. 确认 4 张数据表结构清晰可用 | 🔴 | ⏳ |
| | 3. 输出 WBS 填写规范 | 🟡 | ⏳ |
| **C** | 1. 集成 B 的 plan-edit skill | 🔴 | ✅ prompt 对齐 + 关键词补齐 |
| | 2. plan-generator skill 也安装到 ChatPanel | 🔴 | ✅ 已覆盖在 system prompt 中 |
| | 3. 评估文件上传功能 | 🟡 | ✅ 已实现（纯前端 FileReader） |
| | 4. 接入真实 AI API（等 Key） | 🔴 | ✅ MiniMax M2.5 端到端测试通过 |
| **D** | 1. 文档重构：评分对标前置+三维度满分论证 | 🔴 | ✅ 飞书rev52 |
| | 2. 初赛→决赛持续优化计划 | 🔴 | ✅ 新第八章 |
| | 3. 决赛后业务落地与持续应用规划 | 🔴 | ✅ 新第九章 |
| | 4. +2 汇报文档同步调整 | 🟡 | ✅ rev27 |
| **Eliza** | 1. 提供 API Key | 🔴 | ⏳ |
| | 2. 审阅 D 重构后的文档 | 🔴 | ⏳ |
| | 3. 脱敏检查 + 最终提交 | 🔴 | ⏳ |
| **曹大林** | 继续完善历史项目数据 | 🟡 | ⏳ |
| **乾峰** | API Key 支持 | 🔴 | ⏳ |

### 赛后优化路线图（写入文档用）

| 阶段 | 方向 | 说明 |
|------|------|------|
| 初赛→决赛 | AI 真实接入 | ChatPanel 接 Claude API |
| | 多人协作 | 飞书登录 + 共同编辑 |
| | 大规模验证 | 458 节点压测 |
| | 依赖可视化 | 连接线 + 关键路径高亮 |
| 决赛后落地 | 妙搭部署 | 零运维，飞书生态 |
| | 数据闭环 | 历史数据 → 模板优化 → 更精准生成 |
| | 跨部门推广 | JSON Schema 协议化 → 可跨系统复制 |

## Codex Review 汇总（5/27-28，4 轮）

| Review | 核心结论 | 行动状态 |
|--------|---------|---------|
| 画布性能优化 review | 先修 build，再加 Map/Set 索引，selector 改造放后 | 🔴 执行中 |
| 泳道架构 review | 推荐方案 D（单滚动容器 + sticky left），不拆 Stage | ✅ Day 1-2 已实现 |
| C 对话集成 review | chatApi.ts 独立 + applyImportedProject 统一 + prompt caching | ✅ Phase 1 已采纳 |
| B plan-editor skill review | 职责越界修正 + few-shot 合规 + 编辑规则统一 | ✅ v1.2.0 已全部修复 |

## 人类组员进度

- **@乾峰**：Claude API Key 申请中（C 的 Phase 2 依赖）
- **@曹大林**：整理历史项目数据（关键路径标记 + 依赖关系 + 实际日期）
- **@张越**：阀点周期校核（状态待确认）；已将 HiAgent agent 工作流分享到公共空间

## C 侧进度（对话窗口集成 — API 直连方案）
- [x] 入队：读完全部通信记录 + 项目源代码
- [x] 协作协议升级为团队通用版 v2.0
- [x] 技术方案写入 `C_to_A.md`（组件架构 + 嵌入方式 + 数据桥接）
- [x] A 确认嵌入位置（方案 a）和工具栏入口（Q1/Q2 已回复）
- [x] Codex review 完成：全部建议采纳
- [x] **Phase 1 开发完成**（2026-05-27）：ChatPanel + ChatMessage + ChatStore + mock 模式
- [x] HiAgent 共存分析（2026-05-28）：确认两套方案不冲突
- [x] URL 参数切换方案设计（2026-05-28）：A 已实现代码
- [x] **集成 B 的 plan-edit skill**（2026-05-29）：system prompt 已完整对齐 SKILL.md v1.2.0，`EDIT_QUERY_PATTERN` 补齐 4 个意图关键词
- [x] **Phase 2：API Key 已配置**（2026-05-29）：MiniMax M2.5 临时 Key 已接入，简单对话+计划生成验证通过
- [x] **plan-generator skill 安装到 ChatPanel**（2026-05-29）：system prompt 已覆盖生成核心知识，脚本模式为 CLI 独立路径
- [x] **文件上传功能评估**（2026-05-29）：已实现（Paperclip 按钮 + FileReader + 纯前端，零后端依赖）
- [x] **端到端测试**（2026-05-29）：四场景全通过（对话 / 生成 / 编辑提示 / JSON 提取）
- [x] **🔴 ChatPanel AI 优化**（2026-05-31，Codex review 通过）：
  - 修复 build 阻塞（LoginButton.tsx 未使用 import）+ chatStore 消息重复 bug
  - System Prompt 全面重写：角色"项目规划师" + 回复风格硬约束 + Prototype-first 追问策略 + 用户引导 + FF/FS/SS/SF 术语 + 计划诊断 + 智能补活动 + 8个 few-shot
  - 五级意图注入：EDIT/DIAGNOSE→完整JSON，QUERY→摘要，GENERATE/OTHER→不注入，回退→前端直答
  - 快捷入口动态切换 + 加载状态分阶段提示
  - 设计文档：`docs/chatpanel-ai-optimization-design.md`
  - D 的 3 条需求已覆盖，回复在 `C_to_D.md`
  - TS + build 通过
- [ ] 大赛后迭代（9项存入记忆）：dependencyType 字段、AI 导入 undo、SSE 流式等

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
- [x] **D11ES 历史项目数据导入**（2026-05-28）：777 条记录 → `tblXsZbK2wECas6c`
- [x] 曹大林数据任务下发 + 历史数据表结构搭建
- [x] 模板库业务校对需求发出（张越校对中，Eliza 确认功能闭环优先）
- [x] **编写 plan-edit skill**（🔴 2026-05-28 A 下发）→ v1.2.0 已交付
  - v1.0.0 交付（16:30）→ Codex review → v1.1.0 修复全部 P0/P1/P2（17:00）→ A 确认 + 阀点时序校对 → v1.2.0 以数据库为准更新时序 + 日期口径统一（17:50）
  - C 可直接集成，skill 路径：`.claude/skills/plan-editor/SKILL.md`

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

## 飞书妙搭迁移计划（5/26 Eliza 决策，5/27 调研完成）
- **动机**：HiAgent 部署受限（同域 cookie）+ 认证成本 + Token 成本 + 运维稳定性
- **影响范围**：部署平台 + 认证方式 + AI 对话载体；ProjectData Schema 和 plan-generator 核心逻辑不变
- **项目全貌文档**：`docs/project-panorama-v1.md`（含迁移评估 9 个维度）
- **妙搭知识库**：`https://bytedance.larkoffice.com/wiki/space/7525372713431072772`
- [x] 5/27 调研妙搭能力边界 → 结论已写入 B_to_A.md
- [x] 调研结论同步 A
- **调研结论摘要**：
  - Q1 Konva Canvas：⚠️ 理论可行（React 19 原生），需实测验证
  - Q2 Bitable 鉴权：✅ 大幅简化，内置插件 + 后端直调替代 Netlify Functions
  - Q3 AI 对话：⚠️ 内置 AI 不够用，需用 NestJS 后端调外部 AI API（Claude/豆包）
  - Q4 部署与访问：✅ 完美解决，支持互联网公开访问，评委浏览器直接打开
  - Q5 迁移成本：7-10 天（含 Konva 移植 + 后端 AI + 调试适配）
- **关键决策点**：Konva 能否在妙搭中正常渲染（单点决定性因素）
- [x] **妙搭 MVP 验证通过**（2026-05-27 晚 ~ 5/28）
- [x] 创建妙搭应用「活动策划配置工具」
- [x] Konva Canvas 兼容性验证 ✅ **通过**（react-konva 正常渲染）
- [x] 双栏布局：左侧 AI 对话面板 + 右侧 Konva 画布
- [x] AI 对话→画布渲染流程跑通（输入"A12,全新,SOP 2027-12-01"→生成 8 甬道 96 节点）
- [x] 时间轴头部（年份+月份）、甬道行（交替背景色）、网格线、TODAY 标记
- [x] 3 种节点渲染：活动线条（2px+圆点）、菱形（评审）、五边形（阀点）
- [x] 按甬道分类着色（12 种颜色）+ 阀点特殊色（G0 红/GTC 金黄）
- [x] 画布缩放（滚轮）+ 平移（拖拽）
- [x] 导出 PNG 功能（基础版，待优化清晰度）
- [ ] **Batch 3 修复中**（5 项）：
  - 对话面板可收起/展开（当前固定占 1/3 屏幕）
  - 画布显示项目名称
  - PNG 导出高清（pixelRatio: 2）
  - 一键复制图片到剪贴板
  - 甬道名称纳入 Canvas 渲染（导出时不丢失）
- [ ] Batch 4 待做：云端保存、项目列表、发布

## 妙搭版技术决策（5/28 B + Eliza 确认）
- **活动节点用线条**（同步 A 的方案）：1mm×10mm vs 4mm×10mm，节省 75% 纵向空间
- **不同步 A 的交互优化**：hover tooltip、选中态拖拽手柄等，妙搭版只做静态渲染
- **妙搭版与 Netlify 版独立迭代**：共享 ProjectData JSON Schema，前端实现各自维护
- **数据来源**：静态 JSON（从 Base 导出嵌入代码），不依赖外部 API Key

## C 侧进度（对话组件）
- [x] 入队：阅读全部项目文档和源代码
- [x] 技术方案提交：组件架构 + 嵌入方式 + 数据桥接 + API 抽象
- [x] A 确认方案：右侧面板互斥切换（方案 a）、工具栏入口、ChatStore 独立
- [x] Codex review 完成：全部建议采纳（API 层抽离、helper 共用、JSON 折叠等）
- [x] **Phase 1 开发完成**（2026-05-27）：
  - `src/api/chatApi.ts`：API 抽象 + mock 模式
  - `src/stores/chatStore.ts`：独立 Zustand store
  - `src/components/Chat/ChatPanel.tsx` + `ChatMessage.tsx`：对话 UI
  - `App.tsx`：`applyImportedProject` 统一三处导入 + showChat 互斥
  - `MainToolbar.tsx`：AI 助手按钮（MessageSquare）
  - Vite 编译通过，dev server 正常启动
- [ ] Eliza 验证：打开 AI 助手 → mock 对话 → 导入画布
- [ ] Phase 2：接入 Claude API（等 Key）

## 已确认约定
- 字段命名以 A 的需求文档为准
- 旧 Base Token: `OlOrb85gyaMsLEssTR5c3l1inJs`，旧总表: `tblt8tYNkJF2XyJ5`（仅供参考，不再使用）
- **新 Base Token: `YXtcb43qOaTLLVsI1FGc1ZXFnUb`**
- 活动模板表: `tblb3VeOmziHd6SJ` | 依赖关系表: `tbli5zBwZHiqmjIT` | 阀点定义表: `tblbEit1yZPEmhOv` | 甬道定义表: `tblhTrgNYilxOYQY`
- 建表清单：活动总表 + 依赖关系表（新增）+ 阀点定义表 + 甬道定义表 = 4张表
- 项目规模枚举：平台首发 / 全新 / 中改 / 小改 / 海外
- "换代"="全新"，不单独设枚举值

## D 侧进度（比赛交付）
- [x] 入队：读完全部通信记录 + 比赛规则 + 项目存档 + 源代码结构
- [x] 比赛提交文档结构 v1 完成（`docs/competition-submission-structure-v1.md`）
- [x] Agent Team 协作方案文档 v1 完成（`docs/agent-team-protocol.md`）
- [x] 比赛提交文档正文 v1 完成（`docs/competition-submission-v1.md`）
- [x] **飞书交付文档 v1 完成**（2026-05-28）：9章+附录全部插入，含 callout/表格/SVG 画板/代码块
  - 文档链接：`https://xiaopeng.feishu.cn/docx/UztWd3AOyojcY9xXNb9c92lunyd`
  - 录屏占位 @李梦莹 已预留
- [x] **PRD 对照分析完成**（2026-05-28）：对比 PRD（5/14）vs 实际交付，差异评估已反馈 Eliza
  - 3 个进化点：ECharts→Konva、Excel→Bitable、WBS→JSON Schema
  - P0 缺口应对：级联影响+风险识别 → Eliza 确认用 Prompt-driven demo 方式
- [x] **飞书文档补充 PRD 演进叙事**（已完成，5.6节）
- [x] **Ch5.4 重构**（2026-05-28）：三种AI对话方案从"评估取舍"改为"三条路径·多元适配"
  - 新叙事：一个协议，三种触达（妙搭→零代码 / HiAgent→信息安全 / 自建API→模型灵活）
- [x] **A 回复 3 个需求**（2026-05-28）：级联影响 demo ✅ / 飞书解析评估 ✅ / Step 4 排期 ✅
- [x] **+2 汇报文档**（2026-05-28）：`https://xiaopeng.feishu.cn/docx/JRKTdPAwwopN6LxLfG2cgiNunWf`
- [x] **评分维度对标重构**（2026-05-28 17:30）：
  - 飞书交付文档插入「评分维度达标总览」（6条指标 × 达成 × 证据）
  - Ch5.4 重构为优势/劣势对比表，标注推荐方案三，加结论callout
  - Ch4 新增创意性命中点标注（4个命中点 + 跨品牌叙事强化）
  - CLAUDE.md 新增4条表达原理（PREP/SCQA/SUCCESs/费曼检验）
- [x] **README.md 更新**（2026-05-28）：补充 plan-generator / Agent Team / 飞书数据源信息
- [x] **使用说明飞书文档创建**（2026-05-28）：`https://xiaopeng.feishu.cn/docx/O1bldyT6uoszJhxMr7rckNEKntc`
- [x] **competition-submission-v1.md 同步**（2026-05-28）：评分总览 + 优劣势表 + 创意性标注
- [x] **打包交付清单发送 A**（2026-05-28 17:30）：13项物料 × 状态，见 D_to_A.md
- [x] **功能覆盖矩阵插入**（2026-05-28 18:35）：3方案 × 6功能对比表插入飞书交付文档 Ch5.4（rev 46）
  - 6 功能列：对话 / 计划生成 / 画布编辑（人工）/ 对话编辑（AI辅助）/ 计划导出 / Agent读取
  - 定义了两种"编辑"：画布编辑 = 拖拽节点；对话编辑 = 自然语言→AI批量联动修改
  - HiAgent 对话编辑短板标注：固定工作流无法处理迭代式精细调整
  - competition-submission-v1.md 同步更新
- [x] **录屏方案与 Eliza 对齐**（2026-05-28 18:35）：
  - 矩阵录屏：妙搭 / ChatPanel / HiAgent × 6功能，每格 = 动图 + 文字描述
  - 独立展示：Agent Team 运行实况 + recall.skill 上下文恢复 + 跨Agent JSON互操作
  - Eliza 开始录屏，录完提供文件路径，D 负责插入文档
- [x] **🔴 文档重构交付**（2026-05-29）：A 下发的 4 项任务全部完成
  - 评分对标：6行概览表 → 三维度独立段落满分论证（飞书 rev 49）
  - 新增第八章：初赛→决赛持续优化计划（5项 × 预估周期 × 验收标准）
  - 新增第九章：决赛后业务落地（部署/数据闭环/推广/工具协同/长期愿景）
  - 原第九章→第十章，+2 汇报文档同步（rev 27）
  - HiAgent 向下兼容价值点（Eliza 反馈）加入评分对标 + Ch5.4
  - 飞书主文档最终 rev: 52
- [ ] Eliza 录屏完成 → D 插入飞书文档
- [ ] Eliza 审阅文档 → 反馈修改
- [ ] 路演脚本准备（8-10min 演示 + 2min 问答）
- [ ] 最终版文档（含录屏链接、脱敏处理）
