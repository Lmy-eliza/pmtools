# Smart Planner — 可视化项目规划工具

> 拖拽式项目管理画布，支持 AI Agent 生成计划 → 可视化编辑 → JSON 导出供其他 Agent 消费

**线上地址**：https://project-planner-pmtools.netlify.app/

## 核心功能

- **拖拽即排期** — 拖动节点调整日期，依赖节点自动同步
- **关键路径高亮** — 自动计算并高亮关键路径，掌控进度风险
- **JSON 导入/导出** — 标准化 JSON 格式，Agent 可读可写
- **飞书画板导出** — 导出为 DrawIO 格式，无缝衔接团队协作
- **版本管理** — 支持版本历史保存，随时回溯
- **飞书云同步** — 登录飞书后项目自动云端同步

---

## ProjectData JSON Schema（v1.0）

本 Schema 是 AI Agent 与 Smart Planner 之间的通信协议。Agent 按此格式生成 JSON，Web 应用可直接导入渲染；用户在画布上编辑后导出的 JSON 也遵循此格式，其他 Agent 可直接读取和二次编辑。

### 顶层结构

```json
{
  "schemaVersion": "1.0",
  "id": "string (UUID v4)",
  "name": "string (项目名称)",
  "startDate": "ISO 8601 (如 '2025-06-01T00:00:00.000Z')",
  "endDate": "ISO 8601",
  "swimlanes": [],
  "nodes": [],
  "connections": [],
  "constraints": [],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### Swimlane（泳道）

```json
{
  "id": "string (UUID v4)",
  "name": "string (泳道名称)",
  "order": "number (排序，从 0 开始)",
  "isCollapsed": "boolean (默认 false)"
}
```

### PlanNode（节点）

```json
{
  "id": "string (UUID v4)",
  "type": "NodeType",
  "name": "string (节点名称)",
  "color": "string (HEX 颜色)",
  "x": "number (画布 X 坐标，像素)",
  "y": "number (画布 Y 坐标，像素)",
  "date": "ISO 8601 (节点日期)",
  "swimlaneId": "string (所属泳道 ID)",
  "width": "number (可选，仅 rectangle 类型)",
  "endDate": "ISO 8601 (可选，仅 rectangle 类型)",
  "emoji": "string (可选，仅 emoji 类型)"
}
```

**NodeType 枚举**

| 类型 | 用途 | 形状 | 默认颜色 |
|------|------|------|---------|
| `pentagon` | 阀门 G0-G10 | 五边形 | `#64D2FF` |
| `diamond` | 阶段门 TG、里程碑 | 菱形 | `#007AFF` |
| `rectangle` | 开发/测试活动（有工期） | 矩形 | `#32ADE6` |
| `triangle` | 决策点 | 三角形 | `#AF52DE` |
| `star` | 重要里程碑 | 星形 | `#FFD700` |
| `circle` | 状态节点 | 圆形 | `#34C759` |
| `hexagon` | 特殊节点 | 六边形 | `#5856D6` |
| `emoji` | 带 emoji 标记 | emoji | `#FF9500` |

### Connection（连接线）

```json
{
  "id": "string (UUID v4)",
  "sourceNodeId": "string (起点节点 ID)",
  "targetNodeId": "string (终点节点 ID)",
  "style": "'solid' | 'dashed' | 'dotted'",
  "color": "string (可选)",
  "isCriticalPath": "boolean (可选)",
  "pathConfig": {
    "sourceAnchor": "'top' | 'bottom' | 'left' | 'right'",
    "targetAnchor": "'top' | 'bottom' | 'left' | 'right'",
    "bendPoints": [{ "rx": 0.5, "ry": 0.5 }]
  },
  "labelOffset": { "x": 0, "y": 0 }
}
```

| style | 用途 |
|-------|------|
| `solid` | 强依赖（必须完成才能开始） |
| `dashed` | 弱依赖（建议顺序） |
| `dotted` | 信息流 |

### TimeConstraint（时间约束）

```json
{
  "id": "string (UUID v4)",
  "sourceNodeId": "string",
  "targetNodeId": "string",
  "offsetMonths": "number (间隔月数，可为负)",
  "isLocked": "boolean",
  "style": "'solid' | 'dashed' | 'dotted' (可选)",
  "color": "string (可选)"
}
```

### 坐标计算规则

```
monthWidth = 200（每月 200 像素）
swimlaneHeight = 120（每泳道 120 像素）
headerHeight = 60（时间轴头部）

node.x = (nodeDate - projectStartDate).totalDays × (monthWidth / 30)
node.y = headerHeight + swimlane.order × swimlaneHeight + verticalOffset

rectangle.width = (endDate - startDate).totalDays × (monthWidth / 30)
```

---

## 最小有效 JSON 示例

```json
{
  "schemaVersion": "1.0",
  "id": "demo-001",
  "name": "示例项目",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T00:00:00.000Z",
  "swimlanes": [
    { "id": "sw-1", "name": "项目管理", "order": 0, "isCollapsed": false }
  ],
  "nodes": [
    {
      "id": "n-1",
      "type": "pentagon",
      "name": "G0",
      "color": "#64D2FF",
      "x": 1200,
      "y": 120,
      "date": "2026-06-01T00:00:00.000Z",
      "swimlaneId": "sw-1"
    }
  ],
  "connections": [],
  "constraints": []
}
```

---

## 导入方法

**文件导入**：工具栏 → `...` 更多菜单 → 导入 JSON → 选择 `.json` 文件

**粘贴导入**：工具栏 → `...` 更多菜单 → 粘贴 JSON → 粘贴内容 → 点击"新建项目"

导入时会自动验证 JSON 格式（必填字段、节点类型、泳道引用、日期格式），格式错误会显示具体的错误提示。

## 导出方法

**导出 JSON**：工具栏 → `...` 更多菜单 → 导出 JSON

导出的 JSON 包含 `schemaVersion: "1.0"` 字段，其他 Agent 可据此判断格式版本。

**导出画板**：工具栏 → 导出按钮 → 生成 `.drawio` 文件（可导入飞书画板）

---

## 开发指南

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（http://localhost:5173）
npm run build     # 构建生产版本
```

## 技术栈

- React 19 + TypeScript
- Konva Canvas 图形渲染
- Zustand 状态管理
- Dexie 本地数据库（IndexedDB）
- TailwindCSS 样式

## 开源协议

MIT License
