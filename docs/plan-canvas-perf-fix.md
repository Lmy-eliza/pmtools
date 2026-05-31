# Smart Planner 画布性能优化 + 节点修正方案

> 供 Codex review，2026-05-27

---

## 一、问题描述

导入 plan-generator 生成的 96 节点 JSON 后，发现 3 个问题：

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| P1 | 页面严重卡顿，无法滑动 | 🔴 | 基本不可用 |
| P2 | 活动里程碑显示为五边形 | 🟡 | 视觉错误（五边形仅用于阀点 G0-G10） |
| P3 | hover 变胶囊体验差 | 🟡 | 增加复杂度且是 P1 的根因之一 |

---

## 二、根因分析

### P1：卡顿根因（两层叠加）

**根因 A：Stage 级 onMouseMove 全节点扫描**
- 位置：`PlannerCanvas.tsx` 第 745-771 行
- 现象：鼠标每移动 1px，触发一次 `nodes.find()` 遍历**全部节点**做坐标碰撞检测
- 每次碰撞检测调用 `dateToX()` 做日期→像素换算
- 碰撞完调 `setHoverTooltip({...})`，由于每次 x/y 像素不同 → **每次创建新对象引用** → React 判定 state 变化 → **整棵 PlannerCanvas 组件树重渲染**
- 估算：100 节点 × 60Hz 鼠标事件 = 每秒 6000 次 `dateToX` + 数十次 React re-render

```tsx
// PlannerCanvas.tsx:757-770 — 每次鼠标移动都执行
const hoveredNode = nodes.find(node => {
    const calcX = node.type === 'rectangle'
        ? dateToX(node.date, ...) + (node.width || 100) / 2
        : dateToX(node.date, ...);
    // ... 碰撞检测 ...
});
setHoverTooltip({ x: pos.x, y: pos.y, node: hoveredNode }); // 新对象 → re-render
```

**根因 B：RectangleNode hover 态形状重建**
- 位置：`RectangleNode.tsx` 第 34 行、108-109 行、168-218 行
- 现象：每个 RectangleNode 自带 `isHovered` state + `onMouseEnter/Leave`
- hover 时从「细线段」整体切换为「胶囊形」：销毁默认态 Konva 节点 → 创建 hover 态节点（含 `shadowBlur` GPU 阴影）
- 与根因 A 叠加：Stage re-render → 所有 RectangleNode re-render → hover 切换触发组件内 state 变化 → 二次 re-render

```tsx
// RectangleNode.tsx:108-109
onMouseEnter={() => setIsHovered(true)}   // 触发组件 re-render
onMouseLeave={() => setIsHovered(false)}  // 触发组件 re-render

// RectangleNode.tsx:168-178 — hover 态渲染（默认态完全不同的 DOM 结构）
{renderMode === 'hover' && (
    <Rect ... fill={fillColor} cornerRadius={8} shadowBlur={4} ... />  // GPU 阴影
)}
```

### P2：节点类型映射错误

- 位置：`scripts/generate-plan.mjs` 第 64 行
- 原因：飞书表中的「节点类型」字段值 `五边形（里程碑）` 被统一映射为 JSON type `pentagon`
- 但五边形**只应用于阀点节点**（G0-G10, GTC, EOP），活动里程碑应显示为**菱形** `diamond`
- 阀点节点的类型从「阀点定义表」独立读取，映射正确；问题仅在活动节点

### P3：hover 胶囊体验问题

- 默认态显示为细线段，hover 变胶囊形 → 视觉跳跃大
- 日期信息只在 hover 时才能看到 → 导入后看不到任何时间信息
- 用户期望：日期直接跟在活动名称后面，始终可见

---

## 三、修改方案

### 修改 1：`scripts/generate-plan.mjs` — 活动节点类型映射

**改动范围**：1 处常量映射

```js
// Before
const NODE_TYPE_MAP = {
  '矩条形（普通活动）': 'rectangle',
  '菱形（决策/评审节点）': 'diamond',
  '五边形（里程碑）': 'pentagon',     // ← 错误：活动里程碑也变五边形
};

// After — 新增活动专用映射
const ACTIVITY_NODE_TYPE_MAP = {
  '矩条形（普通活动）': 'rectangle',
  '菱形（决策/评审节点）': 'diamond',
  '五边形（里程碑）': 'diamond',      // ← 修正：活动里程碑用菱形
};
// 阀点节点继续使用原 NODE_TYPE_MAP（保留 pentagon）
```

**影响**：仅影响 JSON 生成，不影响前端代码。重新生成 JSON 后活动节点不再出现 `"type": "pentagon"`。

### 修改 2：`PlannerCanvas.tsx` — 移除 hover tooltip 机制

**改动范围**：4 处删除

| 行号 | 改动 | 说明 |
|------|------|------|
| 54 | 删除 `const [hoverTooltip, setHoverTooltip] = useState(...)` | 移除 state |
| 754-770 | 删除 onMouseMove 中 hover 扫描代码 | 保留框选逻辑（749-752） |
| 772 | `onMouseLeave` 中删除 `setHoverTooltip(null)` | 清理引用 |
| 1298-1316 | 删除 hover tooltip HTML 渲染 | 移除 DOM |

**保留**：框选（box-select）功能不受影响，其 `onMouseMove` 逻辑独立。

**性能提升预期**：
- 消除每帧 O(n) 节点遍历
- 消除 `setHoverTooltip` 引起的 React 组件树重渲染
- 鼠标移动将**零 React re-render**（除框选模式外）

### 修改 3：`RectangleNode.tsx` — 移除 hover 态，日期内联显示

**改动范围**：

| 改动 | 涉及行 | 说明 |
|------|--------|------|
| 删除 `isHovered` state | 34 | 不再需要 |
| 删除 `onMouseEnter/Leave` | 108-109 | 不再需要 |
| 删除 `renderMode` 三态 | 97-98 | 改为 `isSelected` 二态 |
| 删除 hover 胶囊渲染 | 168-218 | 整块删除 |
| 改造 default 态 | 131-166 | 名称后追加日期文本 |

**默认态视觉对比**：

```
当前（默认态）：
  活动名称
  ●━━━━━━━━━━━━●

改为：
  ●━━━━━━━━━━━━●
  活动名称  01/01-02/04
```

具体实现：
- 细线（`<Line>`）和两端圆点（`<Circle>`）保持 y=0 不变
- `<Text>` 移到线下方（y=4），内容改为 `${node.name}  ${dateText}`
- fontSize=10，颜色 `#374151`（名称）+ `#9ca3af`（日期，用两个 Text 或单个拼接）
- 不再有任何形状切换和 GPU 阴影

**selected 态**：完全保留现有实现（矩形主体 + 日期标签 + resize 手柄），不改。

---

## 四、改动影响评估

| 维度 | 影响 |
|------|------|
| **性能** | 解决卡顿根因。鼠标移动不再触发 React re-render，节点不再有 hover state |
| **功能** | hover tooltip 被移除。日期信息改为始终可见（内联在名称旁），信息量不减反增 |
| **交互** | 点击选中 → 完整矩形 + resize 手柄不变。拖拽不变。连接线不变 |
| **视觉** | 默认态从「名称在上+细线」变为「细线在上+名称日期在下」，更紧凑 |
| **其他节点** | DiamondNode/PentagonNode 等无 hover 效果，不需改动 |

---

## 五、验证步骤

1. 重新运行 `node scripts/generate-plan.mjs --name "G9X全新换代" --scale "全新" --sop "2028-06-01"`
2. 检查输出 JSON：活动节点全部为 `rectangle` 或 `diamond`，无 `pentagon`
3. 本地 `npm run dev` → 导入 JSON
4. 验证清单：
   - [ ] 页面滚动/缩放流畅
   - [ ] 鼠标移动无卡顿
   - [ ] 活动名称后直接显示日期区间
   - [ ] 阀点（G0-G10 等）为五边形，活动里程碑为菱形
   - [ ] 点击活动显示完整矩形 + 可拖拽 resize
   - [ ] 框选功能正常
