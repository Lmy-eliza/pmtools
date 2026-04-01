# Project Planner V1.0 分享指南

本文档说明如何将 Project Planner 分享给其他人使用。

---

## 方式一：Vercel 在线分享（推荐）

### 优点
- 无需用户安装任何软件
- 随时随地通过浏览器访问
- 自动 HTTPS 加密
- 免费且稳定

### 部署步骤

1. **打开 Vercel 部署页面**
   ```
   https://vercel.com/new
   ```

2. **登录/注册账号**
   - 支持 GitHub、GitLab、Bitbucket 或 Email 登录
   - 免费账号即可

3. **上传项目**
   - 将以下文件夹直接拖拽到网页：
     ```
     D:\claude learning\project-planner\dist
     ```
   - 或者拖拽 zip 文件：
     ```
     D:\claude learning\project-planner\project-planner-v1.0.zip
     ```

4. **等待部署**
   - 通常 30 秒内完成
   - 会自动生成一个 URL，如：`project-planner-xxx.vercel.app`

5. **复制并分享 URL**
   - 将生成的 URL 发送给需要使用的人
   - 只有知道链接的人才能访问

### 访问权限说明
- ✅ URL 是随机生成的，不会被搜索引擎收录
- ✅ 只有你分享链接的人才能访问
- ⚠️ 如需密码保护，需要 Vercel Pro 或自行添加登录功能

---

## 方式二：ZIP 压缩包分发

### 优点
- 完全离线使用
- 数据完全保留在本地
- 无需网络连接

### 分发文件

已准备好的压缩包：
```
D:\claude learning\project-planner\project-planner-v1.0.zip
```

文件大小：约 231 KB

### 用户使用说明

请将以下说明一并发送给用户：

---

#### Project Planner V1.0 使用说明

**方法 A：使用 VS Code Live Server（推荐）**

1. 解压 `project-planner-v1.0.zip` 到任意目录
2. 用 VS Code 打开解压后的文件夹
3. 安装 "Live Server" 扩展（如未安装）
4. 右键点击 `index.html`，选择 "Open with Live Server"
5. 浏览器会自动打开应用

**方法 B：使用 Python 本地服务器**

1. 解压 `project-planner-v1.0.zip` 到任意目录
2. 打开命令行，进入解压目录
3. 运行以下命令：
   ```bash
   # Python 3
   python -m http.server 8080

   # 或 Python 2
   python -m SimpleHTTPServer 8080
   ```
4. 打开浏览器访问 `http://localhost:8080`

**方法 C：使用 Node.js 本地服务器**

1. 解压 `project-planner-v1.0.zip` 到任意目录
2. 打开命令行，进入解压目录
3. 运行以下命令：
   ```bash
   npx serve .
   ```
4. 按提示打开浏览器访问

**注意事项**
- ⚠️ 不能直接双击 `index.html` 打开（会因跨域限制无法正常工作）
- ✅ 必须通过本地服务器运行

---

## 重新构建（如有代码更新）

如果代码有更新，需要重新构建：

```bash
cd "D:\claude learning\project-planner"

# 安装依赖（首次或依赖变化时）
npm install

# 构建生产版本
npm run build

# 重新创建 zip 包
powershell Compress-Archive -Path dist/* -DestinationPath project-planner-v1.0.zip -Force
```

---

## 文件路径汇总

| 文件/目录 | 路径 | 说明 |
|-----------|------|------|
| 构建输出目录 | `D:\claude learning\project-planner\dist` | 用于 Vercel 部署 |
| ZIP 分发包 | `D:\claude learning\project-planner\project-planner-v1.0.zip` | 用于离线分发 |
| 部署计划文档 | `D:\claude learning\project-planner\DEPLOYMENT_PLAN_V1.0.md` | 部署计划详情 |
| 本分享指南 | `D:\claude learning\project-planner\SHARE_GUIDE.md` | 分享操作指南 |

---

*文档创建日期: 2026-03-11*
