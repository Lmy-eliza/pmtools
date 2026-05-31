# Codex 给 Agent A 的修复方案 Review

---
**[2026-05-27 16:31] Codex：**

## Review 对象

文件：C:\Users\XPENG_USER\.claude\plans\powershell-cmd-dev-server-hashed-shamir.md

主题：Smart Planner 画布性能优化 + 节点类型修正方案

## 总体判断

当前方案的大方向是对的：

- 活动里程碑被映射成 pentagon 是明确的数据生成错误，应修正。
- PlannerCanvas 的 Stage 级 onMouseMove 中每次移动都扫描节点并 setHoverTooltip({ x, y, node })，确实很容易造成整棵 React/Konva 组件树高频重渲染。
- RectangleNode hover 时从细线段切换成胶囊形，并带 shadowBlur，在大量节点场景下会放大卡顿和视觉跳跃。

但当前方案偏“重切除”：直接删除 hover tooltip 和 RectangleNode hover 态，能解决问题，但回归风险较高。建议先走更短、更可逆的路径，把性能根因切掉，再决定是否做体验层面的删除。

## 建议的更短实现路径

### 1. 先单独修正活动节点类型映射

这是最确定、风险最低的一步，可以直接做：

- 活动表中的 五边形（里程碑） 应映射为 diamond。
- 阀点定义表中的 G0-G10、GTC、EOP 继续允许映射为 pentagon。

建议保留两套语义明确的映射：

`js
const ACTIVITY_NODE_TYPE_MAP = {
  '矩条形（普通活动）': 'rectangle',
  '菱形（决策/评审节点）': 'diamond',
  '五边形（里程碑）': 'diamond',
};

const GATE_NODE_TYPE_MAP = {
  '五边形（里程碑）': 'pentagon',
  // 其他阀点类型按现有逻辑保留
};
`

同时建议在导入端或 normalization 层加兼容：如果历史 JSON 中存在“活动节点 + type=pentagon”，可以归一化为 diamond，否则只修生成器无法修复旧数据。

### 2. 先优化 hover tooltip 的 state 更新，不必第一步直接删除 tooltip

当前卡顿最可疑的点不是 
odes.find() 本身，而是每次鼠标移动都执行：

`	sx
setHoverTooltip({ x: pos.x, y: pos.y, node: hoveredNode });
`

这会因为 x/y 每帧变化而创建新对象，导致 React 认为 state 变化，从而触发 PlannerCanvas 及子树重渲染。

更短修法：

- React state 只保存 hoveredNodeId 或 hoveredNode，并且只在节点变化时更新。
- 鼠标坐标不要进 React state，放到 useRef。
- tooltip 的位置用 equestAnimationFrame 直接更新 DOM style，或至少节流到一帧一次。

示意：

`	sx
const hoverNodeIdRef = useRef<string | null>(null);
const tooltipPosRef = useRef({ x: 0, y: 0 });
const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

function updateHover(nextNode: PlannerNode | null, pos: { x: number; y: number }) {
  tooltipPosRef.current = pos;

  const nextId = nextNode?.id ?? null;
  if (hoverNodeIdRef.current !== nextId) {
    hoverNodeIdRef.current = nextId;
    setHoveredNodeId(nextId);
  }
}
`

这样可以保留 tooltip 功能，同时把“每个 mousemove 都重渲染”改成“只有进入/离开某个节点时才重渲染”。这比直接删除 tooltip 的回归风险低。

### 3. RectangleNode hover 先做降级，而不是立刻删完整交互

如果产品上仍希望保留 hover 反馈，建议先做低成本降级：

- 去掉 shadowBlur。
- 不在 default/hover 之间切换完全不同的 JSX 结构。
- 保持同一组 Konva 节点，只改变 strokeWidth、opacity、ill 或轻量标记。
- 如果还卡，再删除 hover state。

如果体验目标明确是“不要胶囊 hover，日期常驻显示”，那可以删除 hover 态。但建议把这归类为 UX 改动，而不是性能修复的必要前提。

## 当前方案遗漏或需要补充的点

### 1. 删除 hover tooltip 可能损失非矩形节点信息

方案只给 RectangleNode 增加日期内联显示。但如果 DiamondNode、PentagonNode、阀点、决策节点也依赖 hover tooltip 展示日期、阶段、说明或完整名称，直接删除 tooltip 会造成信息退化。

建议 A 在删除 tooltip 前确认：

- tooltip 当前展示哪些字段。
- 哪些节点类型依赖这些字段。
- 删除后是否有替代展示位置。

### 2. 常驻日期文本可能造成画布拥挤

活动名称  01/01-02/04 常驻显示会增加横向占用。96 个节点场景下，可能出现：

- 长活动名称互相遮挡。
- 缩放较小时文本不可读或重叠。
- 菱形/阀点附近标签冲突。

建议配套策略：

- 活动名称最大宽度 + ellipsis。
- 日期用更浅颜色、独立 Text，必要时在低 zoom 下隐藏日期。
- 选中态或 tooltip 展示完整信息。
- 验证 96 节点 JSON 的最密集区域，而不是只看单节点效果。

### 3. dateToX() 和节点 bounds 可以预计算

即使删掉 tooltip 扫描，渲染和交互里仍可能多次重复计算日期坐标。建议后续把布局计算集中到 useMemo：

`	sx
const layoutNodes = useMemo(() => {
  return nodes.map(node => ({
    ...node,
    x: dateToX(node.date, timelineStart, timelineEnd, width),
    bounds: computeNodeBounds(node),
  }));
}, [nodes, timelineStart, timelineEnd, width]);
`

收益：

- 渲染和命中检测复用同一份坐标。
- 后续做空间索引、虚拟化、框选优化更容易。
- 避免每个事件路径重复日期换算。

### 4. 命中检测可以进一步局部化

当前 100 节点 O(n) 不一定是核心瓶颈，但未来数据量上去后会再次出现。可选优化：

- 如果只是 hover tooltip，优先用 Konva shape 自身事件，不必 Stage 级全量扫描。
- 如果必须 Stage 级命中检测，可以按泳道、时间区间或 x 坐标桶做粗筛。
- 对 box-select，预计算 bounds 后再做矩形相交判断。

### 5. 验证需要加性能指标，而不只是主观“不卡”

建议验证项补充：

- React Profiler：mousemove 时 PlannerCanvas 是否持续 commit。
- Chrome Performance：mousemove 期间 scripting/rendering 时间是否下降。
- 导入 96 节点 JSON 后，滚动、缩放、拖拽、框选分别验证。
- 验证 resize、连接线、选中态、非矩形节点 tooltip/信息展示是否有回归。
- 验证历史 JSON 中活动 pentagon 的兼容处理。

## 推荐执行顺序

1. 修 generate-plan.mjs 的活动节点类型映射，并加一条生成结果检查：活动节点不得输出 pentagon。
2. 优化 PlannerCanvas hover tooltip：React state 只记录 hovered node 变化，坐标移出 state 或节流更新。
3. 运行 96 节点 JSON 做性能验证。如果 mousemove 卡顿已解决，暂不删除 tooltip。
4. 再处理 RectangleNode 的 UX：去胶囊、去阴影、日期常驻显示。该改动单独验证文本重叠和缩放表现。
5. 如果产品确认 tooltip 不再需要，再统一删除 tooltip，并确保所有节点类型的信息都有替代展示。

## 结论

建议不要把“性能修复”和“视觉交互重设计”绑在一次大删除里。更稳的路径是：

- 数据映射错误立即修。
- hover tooltip 先改 state 更新模型，保留功能但消除高频重渲染。
- RectangleNode hover 和日期常驻作为第二阶段 UX 改动处理。

这样实现路径更短，回滚更容易，也能更准确定位到底是哪一处改动解决了卡顿。
