# HiAgent WebSDK 嵌入方案

> **最后更新**：2026-05-26 by Eliza + B
> **状态**：✅ 本地验证通过，可正常对话
> **接手前提**：任何 Agent 均可接手，读完本文即可继续

---

## 1. 最终结论

**根因**：HiAgent WebSDK 要求嵌入页面与 `hiagent.x-peng.com` 同主域名（`*.x-peng.com`），否则浏览器不携带 cookie → 会话验证失败。公司不支持"公开访问"模式。

**解决方案**：mkcert 自签证书 + hosts 映射 → 本地 `https://limy24.x-peng.com`（443端口）→ 同主域 cookie 正常携带 → 验证通过。

---

## 2. 当前状态

| 项目 | 值 |
|------|-----|
| 本地访问地址 | `https://limy24.x-peng.com` |
| 当前 Agent | 计划小千（功能验证用，非最终版） |
| appKey | `d7aviaelvnd0kiio3vl0` |
| baseUrl | `https://hiagent.x-peng.com` |
| 嵌入方式 | 聊天气泡 |
| 嵌入文件 | `index.html` |

---

## 3. 代码改动清单

| 文件 | 改动 |
|------|------|
| `vite.config.ts` | 条件式 HTTPS：有证书 → HTTPS+443+HMR，无证书 → 默认行为 |
| `.gitignore` | 添加 `certs/` 和 `*.pem` |
| `index.html` | HiAgent SDK 嵌入代码（appKey: `d7aviaelvnd0kiio3vl0`） |
| `certs/` | mkcert 生成的自签证书（不提交 git，每位开发者自行生成） |

---

## 4. 新开发者 / 新 Agent 本地环境搭建

```powershell
# 管理员终端执行（一次性）
winget install FiloSottile.mkcert
# 重开终端
mkcert -install
cd D:\claude_learning\project-planner
mkdir certs; cd certs
mkcert limy24.x-peng.com

# 配置 hosts（管理员 PowerShell）
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n127.0.0.1    limy24.x-peng.com"

# 每次启动（管理员终端）
cd D:\claude_learning\project-planner
npm run dev
# 浏览器先登录 hiagent.x-peng.com，再访问 https://limy24.x-peng.com
```

---

## 5. 后续规划

### Agent 切换
- 当前 agent "计划小千" 是功能验证用
- @zhangy183 的正式 agent 开发完成后，只需改 `index.html` 里的 `appKey`
- @zhangy183 需要在 HiAgent 后台给新 agent 加白名单 `https://limy24.x-peng.com`

### 部署问题
- Netlify 域名不满足同域要求，线上无法使用 HiAgent
- 方案A：申请公司 `*.x-peng.com` 子域名部署
- 方案B：迁移到飞书妙答，使用飞书智能机器人替代 HiAgent WebSDK

---

## 6. 相关文件

| 文件 | 说明 |
|------|------|
| `index.html` | SDK 嵌入代码 |
| `vite.config.ts` | HTTPS + HMR 配置 |
| `certs/` | 自签证书（不提交 git） |
| 记忆宫殿 | `E:\claude test data\对话记录-project-planner\context-20260526-HiAgent-WebSDK嵌入全流程-v1.md` |
