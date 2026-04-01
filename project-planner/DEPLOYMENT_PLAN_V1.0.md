# 发布 Project Planner V1.0 到 Vercel

## Context

将 Project Planner 当前版本标记为 V1.0，部署到 Vercel。只有获得链接的人才能访问（不公开列出）。

---

## 访问权限说明

✅ **Vercel 默认就是"知道链接才能访问"**：
- URL 是随机生成的（如 `project-planner-a1b2c3.vercel.app`）
- 不会被搜索引擎索引（除非你主动提交）
- 只有你分享链接的人才能访问
- 免费版无需额外设置

⚠️ 如果需要更强的保护（如密码保护），需要 Vercel Pro 付费版或自行添加登录功能。

---

## 部署步骤

### 方式：通过 Vercel 网页拖拽部署（最简单）

1. **打开** https://vercel.com/new

2. **登录/注册**（可用 GitHub/Email）

3. **拖拽 dist 文件夹** 到页面
   - 或者先压缩 dist 为 zip，再拖拽

4. **等待部署完成**（约 30 秒）

5. **复制 URL**，只分享给需要的人

---

## 操作清单

1. ✅ 确认 dist 目录是最新的（已完成构建）

2. 打开 https://vercel.com/new

3. 登录账号

4. 拖拽 `D:\claude learning\project-planner\dist` 文件夹到网页

5. 部署完成后，复制 URL

6. 将 URL 发送给需要使用的人

---

## 验证

- 打开生成的 Vercel URL
- 测试功能正常
- 确认未分享 URL 的人无法找到该页面

---

## 备选：本地压缩包分发

如果不想使用在线服务，也可以：
```bash
cd "D:/claude learning/project-planner"
powershell Compress-Archive -Path dist/* -DestinationPath project-planner-v1.0.zip -Force
```
然后直接发送 zip 给用户，用户解压后用本地服务器运行。

---

## 当前构建状态

| 文件 | 大小 | 说明 |
|------|------|------|
| `dist/index.html` | 468 B | 入口页面 |
| `dist/assets/index-CIWVitT3.css` | 22 KB | 样式文件 |
| `dist/assets/index-wKs5hXru.js` | 746 KB | 应用代码 |
| `dist/vite.svg` | 1.5 KB | 图标 |
| `project-planner-v1.0.zip` | 231 KB | 备选分发包 |

---

*文档创建日期: 2026-03-11*
