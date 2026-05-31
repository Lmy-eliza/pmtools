# 开发踩坑记录：本地 HTTPS 环境 + JSX 注释语法

> 日期：2026-05-28 | 记录人：Agent A | 用途：比赛交付文档附件素材

---

## 坑 1：本地 HTTPS 开发环境连环故障

### 背景

Smart Planner 使用 Vite dev server 直接监听 443 端口（无反向代理），通过 mkcert 自签证书实现本地 HTTPS。这是因为 HiAgent WebSDK 要求嵌入页与 `hiagent.x-peng.com` 同主域名 + HTTPS。

### 现象

| 问题 | 表现 |
|------|------|
| Chrome HTTPS 划线 + 页面空白 | 证书不被浏览器信任 |
| `npm run dev` 启动失败 | `Error: listen EACCES: permission denied 0.0.0.0:445` |

### 根因

1. **mkcert -install ≠ Chrome 信任**：Windows 上 `mkcert -install` 只写入系统证书库，Chrome 有自己独立的证书管理，需手动导入根 CA
2. **残留 node 进程占端口**：开发过程中 Agent 启动的 dev server 未正常退出，443/444 端口被占，Vite 自动尝试 445 但 Windows 不允许非管理员绑定 <1024 端口
3. **叠加效应**：端口被占 + 证书不信任 → 页面完全无法加载 → 表象为"网站打不开"

### 解决

```powershell
# 1. 管理员 PowerShell 手动导入根 CA 到 Chrome
#    chrome://certificate-manager → 导入 mkcert 根证书 → 勾选信任

# 2. 清理残留进程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. 确认端口释放
netstat -ano | findstr ":443 "
#    只剩 ESTABLISHED/TIME_WAIT（其他程序的出站连接），无 LISTENING → 干净

# 4. 重启 dev server
npm run dev
```

### 教训

- 每次开发前先 `netstat -ano | findstr ":443 "` 确认端口干净
- mkcert 根 CA 安装后，Chrome 要额外手动导入一次
- Windows 低端口（<1024）绑定必须管理员权限

---

## 坑 2：JSX 闭合标签后的注释导致 esbuild 解析失败

### 背景

方案 D 架构重构中，将左侧面板和右侧画布合并为单一滚动容器，涉及多层 `<div>` 嵌套。为便于维护，在闭合标签后加了行内注释标注每层的作用。

### 写法

```tsx
// ❌ 错误写法：注释在最外层 JSX 闭合标签之后
return (
    <div ref={containerRef}>
      ...
      </div>   {/* closes inner */}    ← 这里还在 JSX 内，OK
    </div>{/* closes containerRef */}  ← 最外层闭合后不在 JSX 了，报错！
);
```

### 现象

- **TypeScript `tsc --noEmit`**：零错误（TypeScript 能正确解析）
- **esbuild（Vite 依赖扫描）**：`Expected ")" but found "{"`
- **Babel（Vite 编译）**：`Missing initializer in const declaration`

三个解析器对同一段代码的处理不同，导致 TypeScript 说没问题，但 Vite 启动后页面报错。

### 根因

JSX 的 `{/* comment */}` 语法只在 JSX 元素内部有效。最外层 `</div>` 闭合后，已经回到 JavaScript 表达式上下文（`return (...)` 的括号内），此时 `{` 被解析为 JavaScript 代码块，不是 JSX 表达式容器。

### 解决

```tsx
// ✅ 正确写法：删除行尾注释，或把注释放在闭合标签之前
return (
    <div ref={containerRef}>
      ...
      </div>
    </div>
);
```

### 教训

- JSX 注释 `{/* */}` 只在 JSX 元素**内部**有效
- `tsc --noEmit` 通过 ≠ Vite/esbuild/Babel 能解析 — 三个工具链的 TSX 解析器各有差异
- 多层 div 嵌套时，用缩进层级表达结构比行尾注释更可靠

---

## 对比赛的影响

这两个坑合计消耗约 40 分钟排查时间。虽然不是功能 bug，但阻塞了测试流程。关键收获：

1. **本地环境搭建是 AI 协作的隐性成本** — Agent 能写代码但不能帮你点 Chrome 证书管理界面
2. **多工具链 = 多解析器 = 多种失败模式** — TypeScript 通过不代表一切 OK，Vite 底层用的是 esbuild + Babel
3. **端口管理需要 SOP** — 多 Agent 并行开发时容易残留进程，启动前检查端口应成为习惯
