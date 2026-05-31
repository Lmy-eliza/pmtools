# Codex -> Agent A: 90+ 节点卡顿 review

> 2026-05-28，基于当前 `D:\claude_learning\project-planner` 源码和 `project-planner-export.zip` 快照 review。重点看 90+ 节点卡顿，目标场景要按 458 节点考虑。

## 结论

之前文档里提到的两个热点已经部分处理：`PlannerCanvas` 里的 hover tooltip 全量扫描已经移除，`RectangleNode` 也不再用 hover 胶囊态。现在 90+ 节点仍然卡的主因已经换成更底层的问题：

1. `PlannerCanvas`、`ConnectionLine`、Toolbar/Panel 多处直接 `useCanvasStore()` 订阅整棵 store，任何状态变化都会导致大组件重渲染。
2. 一次重渲染会重新计算 layout、重新渲染所有 nodes / connections / constraints / timeline / grid / frozen overlay。
3. 渲染中有多处 O(n*m) 查找和重复 filter，节点/连线规模上来后会放大。
4. resize 过程中每个 mousemove 都 `updateNode()`，而 `updateNode()` 每次都 `pushHistory()` 深拷贝全量 nodes/connections/constraints，交互时会非常重。

建议比赛前不要继续大改“泳道名称一体化”的架构，先做下面 P0/P1，收益最大、风险最低。

## P0: 先修构建失败

`npm.cmd run build` 当前失败：

- `src/components/Canvas/PlannerCanvas.tsx`: 使用了 `n.status === 'in_progress'`，但 `NodeStatus` 只有 `'on_track' | 'completed' | 'delayed'`。
- `src/components/Nodes/DiamondNode.tsx`: `Rect` 未使用。
- `src/components/Toolbar/MainToolbar.tsx`: `Square` 未使用。

建议统一状态值：如果 UI 文案“进行中”对应类型，应把 `NodeStatus` 的 `on_track` 改名或兼容为 `in_progress`；如果不想动数据模型，就把统计里的 `in_progress` 全部改成 `on_track`。构建不过会影响 Netlify/Vite 交付，优先级高于性能微调。

## P1: 切断整棵 store 订阅

位置：

- `src/components/Canvas/PlannerCanvas.tsx:55-82`
- `src/components/Nodes/ConnectionLine.tsx:28`
- `src/App.tsx:90-100`
- `src/components/Toolbar/MainToolbar.tsx:120-130`
- 多个 panel 也有类似模式

问题：

`const { ... } = useCanvasStore()` 会让组件订阅整个 Zustand state。任何字段变化，包括选中节点、工具切换、项目名输入、连接线 label offset，都可能让 `PlannerCanvas` 整体重新执行。当前 `PlannerCanvas` 一重跑，就会重算 layout、重建所有节点 props、重建所有连线、重建表头和网格。

建议：

- 对 `PlannerCanvas` 使用 selector，只取它真正需要的字段；最好配合 `zustand/shallow`。
- 对 `ConnectionLine` 不要整 store 订阅，只取 `settings.intervalUnit/showIntervals/intervalDecimals` 和需要的 action，或把 `settings` 从父组件传入并让 action 用 `useCanvasStore.getState()`。
- Toolbar/Panel 同理，按字段 selector 拆开，避免它们的 UI 状态拖动画布重渲染。

这是当前最值得先做的性能修复。

## P1: 给渲染数据建索引，去掉 O(E*N)

位置：

- 连接线：`src/components/Canvas/PlannerCanvas.tsx:1047-1089`
- 泳道统计：`src/components/Canvas/PlannerCanvas.tsx:663-669` 和 `732-738`
- 冻结节点：`src/components/Canvas/PlannerCanvas.tsx:1184`
- `isFrozenSwimlane()` 内部 `findIndex`：`src/components/Canvas/PlannerCanvas.tsx:153-155`

问题：

- 每条 connection/constraint 都 `nodes.find()` 两次。100 条线就是 200 次全量查找；458 节点时很明显。
- 每条泳道统计都 `nodes.filter()` 三四次。
- frozen overlay 里 `nodes.filter(n => isFrozenSwimlane(...))`，而 `isFrozenSwimlane` 又 `swimlanes.findIndex()`，是 O(N*S)。

建议在 `PlannerCanvas` 顶部用 `useMemo` 建这些索引：

- `nodeById = new Map(nodes.map(n => [n.id, n]))`
- `nodeRenderById` 或 `calculatedNodeById`，预先算好 `dateToX` 后的 x/y，连线和节点共用。
- `swimlaneIndexById = new Map(swimlanes.map((s, i) => [s.id, i]))`
- `nodesBySwimlane` 和 `swimlaneStatsById`
- `frozenSwimlaneIds = new Set(swimlanes.slice(0, frozenSwimlaneCount).map(s => s.id))`

这样连接线、统计、冻结 overlay 都能从 O(E*N + S*N) 降到 O(E + S + N)。

## P1: memo 化节点和连线，稳定 props

位置：

- `src/components/Canvas/PlannerCanvas.tsx:466-518`
- `src/components/Canvas/PlannerCanvas.tsx:1031-1048`
- `src/components/Canvas/PlannerCanvas.tsx:1077-1095`

问题：

`renderNode` 每次 render 都创建新的 `nodeWithCalculatedPos`、`commonProps`、匿名 `onClick/onDrag/onDragEnd`。即使节点数据没变，子组件也会拿到新引用。`ConnectionLine` 的 `sourceNode={{ ...sourceNode, x: sourceX }}` 也每次创建新对象。

建议：

- 给所有 Node 组件和 `ConnectionLine` 加 `React.memo`。
- 在 `PlannerCanvas` 里用 `useCallback` 稳定 `handleNodeClick/handleNodeDrag/...`。
- 预计算 `calculatedNodes`，尽量保持未变节点对象引用不变。
- selected 判断从 `selectedNodeIds.includes(node.id)` 改为 `selectedNodeIdSet.has(node.id)`，避免节点多时每个节点再扫一次 selected 数组。

这一步和 selector 配合，才能让“只选中一个节点”不再重绘 90/458 个节点。

## P1: resize 不要每帧写 store + pushHistory

位置：

- `src/components/Nodes/RectangleNode.tsx:47-68`
- `src/components/Canvas/PlannerCanvas.tsx:358-402`
- `src/stores/canvasStore.ts:162-168`
- `src/stores/canvasStore.ts:444-454`

问题：

矩形左右 resize 的 `mousemove` 每帧调用 `onWidthChange/onLeftEdgeChange`，父组件再 `updateNode()`。`updateNode()` 当前每次都会 `pushHistory()`，而 `pushHistory()` 用 `JSON.parse(JSON.stringify(...))` 深拷贝全量节点/连线/约束。节点多时 resize 会出现持续卡顿，并且 history 会被一堆中间帧污染。

建议：

- 增加 `updateNodeTransient(id, updates)`：不 push history，用于拖拽/resize 中间帧。
- resize start 时 push 一次 history，mousemove 只 transient update，mouseup 提交最终 update。
- 或者 resize 期间只命令式更新 Konva group/shape，mouseup 才写 store。

同类问题也要检查连接线控制点拖拽：中间态现在用局部 state，相对好一些；最终写 store 没问题。

## P2: layoutEngine 可再降复杂度

位置：

- `src/utils/layoutEngine.ts:25-33`
- `src/utils/layoutEngine.ts:72-78`

问题：

`computeLayout()` 对每条泳道调用 `computeOverlapGroups()`，而 `computeOverlapGroups()` 每次都 `nodes.filter(n => n.swimlaneId === swimlaneId)`。复杂度是 O(S*N)，泳道和节点都多时会变重。

建议：

- 在 `computeLayout` 开头先按 `swimlaneId` 分组一次。
- `computeOverlapGroups` 接受已经分好组的 `laneNodes`，不再自己 filter。

这不是最大热点，但实现很小，适合作为 P1 后的补充。

## P2: 冻结 overlay 现在重复绘制一份 header/grid/frozen nodes

位置：

- `src/components/Canvas/PlannerCanvas.tsx:1102-1188`

问题：

overlay 始终挂载，只靠 scroll handler 命令式 `visible/y` 控制。它会重复创建 header、timeline units、grid、frozen 背景和 frozen 节点。冻结行少时可接受，但 458 节点 + 多冻结行时是额外绘制成本。

建议：

- 短期：只有 `frozenSwimlaneCount > 0 || scrollTop > 0` 时才保持可见内容；header overlay 和 frozen lanes 分离，未冻结时不要渲染 frozen 节点分支。
- 中期：把 header 改成 HTML sticky，Konva 只画内容区；这样能删掉一大块重复绘制。

## 架构建议：一体化泳道先保持当前方案 D

我不建议比赛前转向“每泳道一个 Stage”。跨泳道连线、框选、导出、冻结行都会变复杂，性能也未必更好。

当前方案 D（单一滚动容器 + 左侧 sticky rail + 右侧单 Stage）方向是合理的，比旧的左右独立滚动容器更好。短期把上述 P0/P1 做完，90+ 节点应该能明显改善，也更接近 458 节点目标。

如果后续还有时间，再考虑更彻底的分层：

- 背景网格/header 单独 layer，并开启 cache 或减少 shape 数。
- 节点 layer、连线 layer、交互/选中 layer 分层。
- 超大规模时做 viewport culling，只渲染可视区域附近的节点/连线/网格。

## 建议执行顺序

1. 修 build：`NodeStatus` / unused imports。
2. `PlannerCanvas` 和 `ConnectionLine` 改 selector + shallow，减少无关重渲染。
3. 加 `nodeById`、`nodesBySwimlane`、`swimlaneStatsById`、`frozenSwimlaneIds` 等 memo 索引。
4. `React.memo` 节点/连线组件，稳定 callbacks 和 calculated node 引用。
5. 增加 transient update，resize 中间帧不 pushHistory。
6. 再优化 `layoutEngine` 分组和 overlay 重复绘制。

验证建议：

- 先用 96 节点 JSON 跑一遍滚动、缩放、框选、拖拽、矩形 resize。
- 再构造 450+ 节点、100+ 连接线数据，打开 React Profiler 或 Chrome Performance，看 selection/scroll/resize 是否还触发整棵 `PlannerCanvas` 高成本 commit。
- 每轮修改后运行 `npm.cmd run build`。
