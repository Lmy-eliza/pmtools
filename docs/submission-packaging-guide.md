# 提交打包指南（给 Eliza）

> **目的**：按此指南整理最终提交的压缩包，确保评委解压后能直接使用。

---

## 压缩包目标结构

```
Smart-Planner-提交/
│
├── README.md                           ← 评委第一个看的文件（项目说明+快速体验+技术架构）
│
├── 项目说明文档/
│   ├── competition-submission-v1.md    ← 大赛文档完整 Markdown 版
│   ├── agent-team-protocol.md          ← Agent Team 协作方案
│   └── project-panorama-v1.md          ← 项目全貌（技术参考）
│
├── 使用说明/
│   └── user-guide.md                   ← 场景化使用说明（7 个场景 + 快捷键 + AI 能力说明）
│
├── 飞书文档链接.md                      ← 飞书在线文档链接汇总（主文档+使用说明+数据表）
│
└── project-planner/                    ← 完整项目代码
    ├── README.md                       ← 同根目录 README（项目内也保留一份）
    ├── package.json
    ├── vite.config.ts
    ├── netlify.toml
    ├── index.html
    ├── src/                            ← 前端源代码
    ├── netlify/functions/              ← Serverless Functions（AI 代理+飞书认证）
    ├── scripts/                        ← 倒排计算脚本
    ├── .claude/skills/                 ← AI Skill 定义
    │   ├── plan-generator/SKILL.md
    │   └── plan-editor/SKILL.md
    ├── docs/                           ← 项目内文档
    └── _agent_comms/                   ← Agent 间通信记录（展示协作过程）
```

## 打包步骤

### 步骤 1：创建文件夹

在桌面或任意位置创建 `Smart-Planner-提交` 文件夹。

### 步骤 2：复制根目录文件

| 来源 | 复制到 |
|------|--------|
| `project-planner/README.md` | `Smart-Planner-提交/README.md` |
| `project-planner/docs/submission-links.md` | `Smart-Planner-提交/飞书文档链接.md`（改名） |

### 步骤 3：创建「项目说明文档」文件夹

| 来源 | 复制到 |
|------|--------|
| `D:\claude_learning\docs\competition-submission-v1.md` | `Smart-Planner-提交/项目说明文档/` |
| `D:\claude_learning\docs\agent-team-protocol.md` | `Smart-Planner-提交/项目说明文档/` |
| `project-planner/docs/project-panorama-v1.md` | `Smart-Planner-提交/项目说明文档/` |

### 步骤 4：创建「使用说明」文件夹

| 来源 | 复制到 |
|------|--------|
| `project-planner/docs/user-guide.md` | `Smart-Planner-提交/使用说明/` |

### 步骤 5：复制项目代码

将整个 `project-planner/` 文件夹复制到 `Smart-Planner-提交/project-planner/`。

**需要排除的文件/文件夹**（不要打包进去）：

```
node_modules/          ← 太大，评委 npm install 即可重建
dist/                  ← 构建产物，npm run build 重建
.env                   ← 含 API Key，敏感信息
certs/                 ← 本地 HTTPS 证书
.netlify/              ← Netlify 本地缓存
tmp/                   ← 临时文件
测试内容/              ← 测试数据
*.json（根目录散落的） ← batch-create、field 等临时数据文件
msg-cao/               ← 临时消息文件夹
deno.lock              ← 非本项目文件
```

**必须保留的**：

```
src/                   ← 全部前端源代码
netlify/functions/     ← Serverless Functions
scripts/               ← 倒排计算脚本
.claude/skills/        ← AI Skill 定义
_agent_comms/          ← Agent 通信记录（展示协作过程）
docs/                  ← 项目内文档
docs/功能演示/          ← 三种方案的 GIF/MP4 演示材料（大赛文档引用）
package.json           ← 依赖清单
vite.config.ts         ← 构建配置
netlify.toml           ← 部署配置
index.html             ← 入口页面
tsconfig*.json         ← TypeScript 配置
eslint.config.js       ← 代码规范
.gitignore             ← Git 忽略规则
```

### 步骤 6：脱敏检查

在打包前检查以下内容：

- [ ] `.env` 文件**不在**压缩包中（含 API Key）
- [ ] `certs/` 文件夹**不在**压缩包中（含证书私钥）
- [ ] `_agent_comms/` 中无敏感内容（全是技术讨论，应该没问题）
- [ ] `netlify/functions/chat.js` 中无硬编码的 API Key（已确认使用环境变量）
- [ ] 飞书文档中无个人手机号、身份证号等（由 Eliza 自查）

### 步骤 7：压缩

右键 `Smart-Planner-提交` → 压缩为 `.zip` 文件。

建议文件名：`Smart-Planner-AI整车项目计划智能助手.zip`

---

## 评委拿到后的使用路径

```
解压 → 打开 README.md（了解项目）
     → 点击在线 Demo 链接（直接体验）
     → 如需本地运行：cd project-planner → npm install → npx netlify dev
     → 打开飞书文档链接（查看完整的大赛文档和使用说明）
```
