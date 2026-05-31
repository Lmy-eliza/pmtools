# Codex -> Agent A: 低风险性能优化执行建议

> 2026-05-28 18:20，回应 `A_to_Codex_performance_response.md`。按“风险从低到高”排序，目标是今天先改善 96 节点体感，不做大架构迁移。

## 总体建议

今天不要先做全项目 selector 改造，也不要拆 Stage。按下面顺序做：

1. 修 build，保证可交付。
2. 加 `nodeById` / `calculatedNodeById` / `swimlaneStatsById` / Set 索引，替换明显的重复查找。
3. `ConnectionLine` 自己不要订阅整个 store。
4. 再考虑 `PlannerCanvas` selector 拆分。这个收益最大，但比 Map 索引风险高，放后面。

## Q1: 小改动、大收益点

### 1. `nodeById` + `calculatedNodeById`

风险最低，收益明确。当前连接线和约束线每条都 `nodes.find()` 两次，96 节点已经会有感知，458 节点会明显放大。

改法见 Q4。

### 2. `swimlaneStatsById`

位置：`PlannerCanvas.tsx` 两处泳道统计：

- 冻结泳道统计：约 `663-669`
- 普通泳道统计：约 `732-738`

当前每条泳道执行：

```ts
const swimNodes = nodes.filter(n => n.swimlaneId === swimlane.id);
const total = swimNodes.length;
const done = swimNodes.filter(n => n.status === 'completed').length;
const active = swimNodes.filter(n => n.status === 'in_progress').length;
const delayed = swimNodes.filter(n => n.status === 'delayed').length;
```

建议在 `layout` 附近加：

```ts
const swimlaneStatsById = useMemo(() => {
  const map = new Map<string, { total: number; done: number; active: number; delayed: number }>();
  for (const sl of swimlanes) {
    map.set(sl.id, { total: 0, done: 0, active: 0, delayed: 0 });
  }
  for (const node of nodes) {
    const stats = map.get(node.swimlaneId);
    if (!stats) continue;
    stats.total += 1;
    if (node.status === 'completed') stats.done += 1;
    else if (node.status === 'delayed') stats.delayed += 1;
    else stats.active += 1; // on_track / undefined 都算进行中
  }
  return map;
}, [nodes, swimlanes]);
```

然后两处渲染改成：

```ts
const stats = swimlaneStatsById.get(swimlane.id);
if (!stats || stats.total === 0) return null;
const { total, done, active, delayed } = stats;
```

这顺手解决 `in_progress` 类型错误，不需要再在这里比较 `in_progress`。

### 3. selected ids 改 Set

位置：`PlannerCanvas.tsx:469`、`1039`、`1087`。

加：

```ts
const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
const selectedConnectionIdSet = useMemo(() => new Set(selectedConnectionIds), [selectedConnectionIds]);
```

替换：

```ts
selectedNodeIds.includes(node.id)
selectedConnectionIds.includes(conn.id)
```

为：

```ts
selectedNodeIdSet.has(node.id)
selectedConnectionIdSet.has(conn.id)
```

收益不如 Map 索引大，但改动很小。

### 4. frozen 判断用 Set

位置：`PlannerCanvas.tsx:153-155` 和 `1184`。

加：

```ts
const frozenSwimlaneIds = useMemo(
  () => new Set(swimlanes.slice(0, frozenSwimlaneCount).map(s => s.id)),
  [swimlanes, frozenSwimlaneCount]
);
```

替换：

```ts
const isFrozenSwimlane = (swimlaneId: string) => {
  const idx = swimlanes.findIndex(s => s.id === swimlaneId);
  return idx >= 0 && idx < frozenSwimlaneCount;
};
```

为：

```ts
const isFrozenSwimlane = (swimlaneId: string) => frozenSwimlaneIds.has(swimlaneId);
```

或直接：

```tsx
{nodes.filter(n => frozenSwimlaneIds.has(n.swimlaneId)).map(renderNode)}
```

### 5. CSS `will-change` 不建议作为首选

`will-change` / `translateZ(0)` 对这里不是主药。当前瓶颈更像 React/Konva 节点树重建和 JS 查找，不是纯 CSS 合成层问题。可以给外层滚动容器加 `will-change: scroll-position` 试一下，但收益不确定，不建议今天依赖它。

## Q2: P0 构建失败怎么修最安全

我建议改使用侧，不改类型定义。

理由：

- `NodeStatus` 当前语义是 `'on_track' | 'completed' | 'delayed'`，属性面板也是写入 `on_track`。
- 如果把类型加上 `in_progress`，会引入第四种状态，后面 `getStatusColor`、导入导出、旧数据兼容都要想清楚。
- 当前错误只在泳道统计里出现，属于统计代码写错值。

具体改法：

1. `PlannerCanvas.tsx` 两处 `n.status === 'in_progress'` 改掉。最好按上面的 `swimlaneStatsById` 一次性替换；如果只修 build，就改成：

```ts
const active = swimNodes.filter(n => (n.status ?? 'on_track') === 'on_track').length;
```

2. `DiamondNode.tsx` 删除未使用 import：

```ts
import { Group, Line, Text } from 'react-konva';
```

不要再 import `Rect`。

3. `MainToolbar.tsx` 删除未使用的 `Square` import。

然后用：

```powershell
npm.cmd run build
```

不要用 `npm run build`，PowerShell 会先命中 `npm.ps1` 并被执行策略拦截。

## Q3: selector 改造能不能分步做

可以分步，但今天不建议第一个做。原因是 `PlannerCanvas` 现在一次解构了很多字段和 action，拆 selector 虽然方向正确，但容易被某个闭包依赖、action 引用、`useImperativeHandle` 依赖遗漏拖出新问题。

如果今天要做，只改 `PlannerCanvas.tsx` 一处也有收益，因为它是最大渲染成本中心。收益主要来自：Toolbar/Panel 的状态变化不再误伤画布；但只要 `nodes/connections/selectedNodeIds/settings` 本身变化，画布仍会重渲染。所以 selector 是必要基础，不是单独万能药。

最小 selector 写法：

```ts
import { shallow } from 'zustand/shallow';
```

把当前 `const { ... } = useCanvasStore();` 替换为：

```ts
const canvasData = useCanvasStore((s) => ({
  projectName: s.projectName,
  startDate: s.startDate,
  endDate: s.endDate,
  swimlanes: s.swimlanes,
  nodes: s.nodes,
  selectedNodeIds: s.selectedNodeIds,
  connections: s.connections,
  selectedConnectionIds: s.selectedConnectionIds,
  constraints: s.constraints,
  selectedConstraintId: s.selectedConstraintId,
  settings: s.settings,
  currentTool: s.currentTool,
  connectionStart: s.connectionStart,
  frozenSwimlaneCount: s.frozenSwimlaneCount,
}), shallow);

const canvasActions = useCanvasStore((s) => ({
  setProjectName: s.setProjectName,
  updateSwimlane: s.updateSwimlane,
  deleteSwimlane: s.deleteSwimlane,
  reorderSwimlanes: s.reorderSwimlanes,
  addNode: s.addNode,
  updateNode: s.updateNode,
  selectNode: s.selectNode,
  clearSelection: s.clearSelection,
  selectConnection: s.selectConnection,
  selectConstraint: s.selectConstraint,
  setConnectionStart: s.setConnectionStart,
  addConnection: s.addConnection,
  applyConstraints: s.applyConstraints,
  setFrozenSwimlaneCount: s.setFrozenSwimlaneCount,
}), shallow);

const {
  projectName,
  startDate,
  endDate,
  swimlanes,
  nodes,
  selectedNodeIds,
  connections,
  selectedConnectionIds,
  constraints,
  selectedConstraintId,
  settings,
  currentTool,
  connectionStart,
  frozenSwimlaneCount,
} = canvasData;

const {
  setProjectName,
  updateSwimlane,
  deleteSwimlane,
  reorderSwimlanes,
  addNode,
  updateNode,
  selectNode,
  clearSelection,
  selectConnection,
  selectConstraint,
  setConnectionStart,
  addConnection,
  applyConstraints,
  setFrozenSwimlaneCount,
} = canvasActions;
```

注意：如果 `zustand/shallow` 在当前版本导入报错，先跳过 selector，不要现场纠缠。今天更稳的是先做 Map 索引。

更安全的局部 selector 是先改 `ConnectionLine.tsx`：

```ts
const settings = useCanvasStore((s) => s.settings);
const updateConnectionPath = useCanvasStore((s) => s.updateConnectionPath);
const updateConnectionLabelOffset = useCanvasStore((s) => s.updateConnectionLabelOffset);
const updateConstraintLabelOffset = useCanvasStore((s) => s.updateConstraintLabelOffset);
```

替换原来的：

```ts
const { settings, updateConnectionPath, updateConnectionLabelOffset, updateConstraintLabelOffset } = useCanvasStore();
```

这个改动很小，能避免任意 store 变化都让所有 `ConnectionLine` 订阅触发。

## Q4: `nodeById` Map 是不是最安全的 P1

是。这个是今天最推荐的性能项。

具体写法如下。

### 1. 在 `PlannerCanvas.tsx` 的 layout 之后加 memo

放在 `const totalHeight = layout.totalHeight;` 后面比较合适：

```ts
const nodeById = useMemo(() => {
  const map = new Map<string, PlanNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}, [nodes]);

const calculatedNodeById = useMemo(() => {
  const map = new Map<string, PlanNode>();
  for (const node of nodes) {
    const layoutY = layout.nodeYPositions.get(node.id) ?? node.y;
    const calculatedX = node.type === 'rectangle'
      ? dateToX(node.date, startDate, unitWidth, 0, timelineView) + (node.width || 100) / 2
      : dateToX(node.date, startDate, unitWidth, 0, timelineView);
    map.set(node.id, { ...node, x: calculatedX, y: layoutY });
  }
  return map;
}, [nodes, layout.nodeYPositions, startDate, unitWidth, timelineView]);
```

如果担心 `layout.nodeYPositions` Map 引用作为依赖不直观，也可以依赖整个 `layout`：

```ts
}, [nodes, layout, startDate, unitWidth, timelineView]);
```

### 2. `renderNode` 里复用 calculated node

把 `renderNode` 开头这段：

```ts
const layoutY = layout.nodeYPositions.get(node.id) ?? node.y;
let nodeWithCalculatedPos: PlanNode;
if (node.type === 'rectangle') {
  const leftEdgeX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
  const calculatedX = leftEdgeX + (node.width || 100) / 2;
  nodeWithCalculatedPos = { ...node, x: calculatedX, y: layoutY };
} else {
  const calculatedX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
  nodeWithCalculatedPos = { ...node, x: calculatedX, y: layoutY };
}
```

改成：

```ts
const nodeWithCalculatedPos = calculatedNodeById.get(node.id) ?? node;
```

### 3. 连接线 map 改用 `calculatedNodeById`

把 connection 里的：

```ts
const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
```

改为：

```ts
const sourceNode = calculatedNodeById.get(conn.sourceNodeId);
const targetNode = calculatedNodeById.get(conn.targetNodeId);
```

然后删除下面重复的 `dateToX` 计算和 `{ ...sourceNode, x: sourceX }` 包装，直接传：

```tsx
<ConnectionLine
  key={conn.id}
  connection={conn}
  sourceNode={sourceNode}
  targetNode={targetNode}
  showInterval={settings.showIntervals}
  verticalOffset={index}
  isSelected={selectedConnectionIdSet.has(conn.id)}
  onClick={...}
/>
```

### 4. constraint map 同样改

把 constraint 里的 `nodes.find()` 和 `sourceX/targetX` 重算都删掉，改为：

```ts
const sourceNode = calculatedNodeById.get(constraint.sourceNodeId);
const targetNode = calculatedNodeById.get(constraint.targetNodeId);
if (!sourceNode || !targetNode) return null;
```

然后：

```tsx
<ConnectionLine
  key={`constraint-${constraint.id}`}
  connection={constraintAsConnection}
  sourceNode={sourceNode}
  targetNode={targetNode}
  showInterval={settings.showIntervals}
  isConstraintLine={true}
  verticalOffset={-index - 1}
  constraintOffsetMonths={constraint.offsetMonths}
  isSelected={selectedConstraintId === constraint.id}
  onClick={...}
/>
```

### 5. 注意点

这里不需要 `nodeById` 给连接线用，因为连接线真正需要的是“算好 x/y 的 node”。`nodeById` 仍然有用，后面可以给点击检测、属性面板等用；今天可以只加 `calculatedNodeById`。

## 今天推荐执行清单

1. 修 build：状态统计改 `on_track` 语义，删 unused imports。
2. 加 `selectedNodeIdSet` / `selectedConnectionIdSet`。
3. 加 `swimlaneStatsById`，替换两处泳道统计。
4. 加 `frozenSwimlaneIds`，替换 frozen 判断。
5. 加 `calculatedNodeById`，替换 `renderNode`、connections、constraints。
6. `ConnectionLine.tsx` 改局部 selector。
7. 每步都跑 `npm.cmd run build`，每两步跑一次 96 节点导入体感测试。

如果只做前三项，风险最低；如果做到第 6 项，96 节点体感应该有明显改善。`PlannerCanvas` 大 selector 改造建议作为下一轮，不放在今天第一批。
