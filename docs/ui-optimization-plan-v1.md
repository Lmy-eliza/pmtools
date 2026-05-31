# Demo 画布 UI 优化方案 — Codex Review 请求

> 请求方：Agent A | 日期：2026-05-31 | 优先级：🔴 DDL 日

## 背景

Eliza 测试 demo 画布后反馈 3 类视觉问题。当前 demo 数据是 `tmp/demo-showcase.json`（6 泳道 / 44 节点 / 45 连线），通过 `chatApi.ts` 的 `prepareDemoData()` 运行时处理后返回给前端。

截图中暴露的问题：

1. **节点重叠**：同一泳道内多个节点 y 坐标相同，互相遮挡
2. **连线混乱**：连线锚点集中在节点中心一个点上，多条线汇聚时视觉错乱
3. **非关键路径连线太显眼**：黑色实线和关键路径红线同等醒目

## 当前架构

### 数据流

```
demoData.ts (原始JSON) → chatApi.ts/prepareDemoData() (运行时处理) → ChatPanel → onImportJSON → canvas
```

### 坐标系统（定义在 system prompt + 渲染代码中）

```
monthWidth = 200px
swimlaneHeight = 120px
headerHeight = 60px

x = (节点日期 - startDate).总天数 × (200/30)
y = headerHeight + swimlane.order × swimlaneHeight + 泳道内偏移
```

### 连线渲染

文件：`src/components/Nodes/ConnectionLine.tsx`

连线从 sourceNode 中心到 targetNode 中心画直线/曲线。当前实现：
- 所有连线的锚点都是**节点中心点**
- 没有区分上下左右四个方向的锚点
- 多条连线汇聚到同一个节点时，线段重叠在一起

### 节点布局

demo 数据中每个泳道高度 120px，节点 y 坐标手动指定。问题：
- 阀点（pentagon）全部在泳道 0 的 y=90
- 活动节点（rectangle）也在 y=90，与阀点重叠
- 评审里程碑（diamond）在 y=120，与活动节点紧挨

## 优化需求（3 项）

### 需求 1：Demo 数据节点布局优化

**目标**：同一泳道内节点不重叠，阀点保持同一水平线

**约束**：
- 所有阀点（pentagon 类型）必须在同一 y 坐标（泳道 0 第一行）
- 同一泳道内的 rectangle 活动节点，如果 x 坐标范围有重叠（x 到 x+width），必须错开 y 位置
- diamond 评审节点可以放在活动节点下方

**方案选项**：

A. **纯数据修改**（在 `prepareDemoData()` 中）：
   - 扫描每个泳道，检测 x 范围重叠的节点
   - 重叠的节点自动错开 y 坐标（每行 +30px）
   - 阀点始终固定在 y = headerHeight + swimlane.order × swimlaneHeight + 15

B. **修改 demo-showcase.json 原始数据**：
   - 手动调整重叠节点的 y 坐标
   - 简单但不通用

**A 推荐**：方案 A，因为实际用户通过 AI 生成的计划也会有同样的重叠问题。

### 需求 2：连线锚点方向优化

**目标**：连线从节点的合理方向（上/下/左/右）出发，而不是全部从中心点出发

**当前问题**：
- `ConnectionLine.tsx` 计算连线起终点时，直接用节点中心坐标
- 多条连线连到同一个节点时，线段重叠在一起
- 视觉上看不清哪条线连哪个节点

**方案**：

修改 `ConnectionLine.tsx` 的锚点计算逻辑：

```
// 根据 source 和 target 的相对位置，选择最近的边缘锚点
// 而不是始终用中心点

if (target 在 source 右边) {
  sourceAnchor = source 右边缘中点
  targetAnchor = target 左边缘中点
} else if (target 在 source 下边) {
  sourceAnchor = source 底边缘中点
  targetAnchor = target 顶边缘中点
}
// ... 以此类推
```

对于 rectangle 节点：
- 水平方向：从 (x, y+h/2) 或 (x+width, y+h/2) 出发
- 垂直方向：从 (x+width/2, y) 或 (x+width/2, y+h) 出发

对于 pentagon / diamond 节点：
- 上下左右四个角/边的中点

**多条线同节点时**：在同一个边缘上均匀分散锚点，避免重叠。

### 需求 3：非关键路径连线视觉降级

**目标**：关键路径清晰醒目，非关键路径退为背景

**当前状态**：
- 关键路径：红色实线（`isCriticalPath: true`）
- 非关键路径：默认黑色线，和关键路径一样醒目

**方案**（修改 `ConnectionLine.tsx` 默认样式）：

| 属性 | 关键路径 | 非关键路径 |
|------|---------|-----------|
| 颜色 | `#FF3B30`（红色） | `rgba(0,0,0,0.15)`（浅灰） |
| 线宽 | 2px | 1px |
| 样式 | solid | 保持原样（solid/dashed/dotted） |
| 箭头 | 正常大小 | 缩小或去掉 |

**Demo 数据侧**：`prepareDemoData()` 目前已过滤掉非关键路径连线。但如果渲染层改好了，可以恢复非关键路径连线，因为它们会自然退为背景。

## 泳道状态指示器（已完成）

**需求**：每个泳道始终显示 🟢x 🔵x 🔴x 三色圆点计数，即使某状态为 0。

**已完成**：`PlannerCanvas.tsx` 两处 stats 渲染（冻结泳道 + 普通泳道）已从 `count > 0` 条件改为始终显示。

## 涉及文件

| 文件 | 改动范围 |
|------|---------|
| `src/components/Nodes/ConnectionLine.tsx` | 需求 2 + 需求 3：锚点方向 + 视觉降级 |
| `src/api/chatApi.ts` → `prepareDemoData()` | 需求 1：节点 y 坐标自动错开 |
| `src/components/Canvas/PlannerCanvas.tsx` | 已完成：泳道状态指示器 |

## Review 请求

请 Codex 评估：

1. 需求 2（连线锚点方向）的实现复杂度和风险——DDL 日是否值得做？
2. 需求 1 的自动布局算法是否有更好的方案？
3. 需求 3 的颜色/线宽参数建议？
4. 是否有我遗漏的视觉问题？

如果需求 2 风险太高，备选方案是：在 demo 数据中把连线数量控制在最少（目前已只保留关键路径 20 条），避免多条线汇聚的问题。
