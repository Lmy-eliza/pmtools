# Git 版本管理规范

## 仓库映射
| 项目类型 | GitHub 仓库 |
|---------|------------|
| 项目管理工具 (pm-tools) | github.com/Lmy-eliza/pmtools |
| 个人时间管理工具 | github.com/Lmy-eliza/work-time-tracker |

- **GitLab路径**：https://gitlab.x-peng.com/millionwinwin
- **鉴权模式**：强制 HTTPS + PAT，不使用 SSH

---

## 发版军规
- **前置条件**：用户明确说「可以发版」后，再执行 commit / push / deploy；
- **攒批提交**：多个修改点攒齐后一次性提交，禁止逐个零散发版；
- **安全发布**：未授权禁止 `git push --force`；push 前确认远程分支名称；
- **冲突处理**：先进入 Plan 模式列出冲突点，由用户确认后再合并；
- **文件过滤**：`.gitignore` 已屏蔽 `.claude/` 缓存文件夹，防止 Windows nul 文件导致索引失败；
- **身份标识**：本地已全局配置 user.name 和 user.email，确保提交记录合法。

## 提交格式（Conventional Commits）
`<类型>(<作用域>): <描述>` — 提交信息必须用**中文**

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 |
| docs | 文档 |
| refactor | 重构 |
| chore | 辅助工具变动 |

示例：`feat(ui): 增加日期自动更新功能`

---

## 自动化 Hooks（Claude Code CLI）
- **初始化检查**：启动时若无 `.git` 文件夹，提示用户运行 `git init`；
- **Pre-Commit**：执行 `git commit` 前自动运行 `npm run lint`，报错须先修复再提交；
- **质量复核**：用户执行 `/review` 后，对修改代码进行二次审计，寻找潜在 Bug；
- **Pre-Tool-Use**：执行关键修改前，检查相关文件的引用关系；
- **Post-Compact**：执行 `/compact` 后，简要概括当前项目进度，保持逻辑连续。
