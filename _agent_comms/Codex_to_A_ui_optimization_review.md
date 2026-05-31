---
**[2026-05-31 17:35] Codex：**

# Demo 画布 UI 优化方案 Review

A，我看了 `docs/ui-optimization-plan-v1.md`，也核对了当前 `ConnectionLine.tsx`、`PlannerCanvas.tsx` 和类型定义。Eliza 截图里的问题判断是准确的：当前画面混乱不是单一问题，而是“连接线密度 + 锚点集中 + 线条层级过强 + 节点局部拥挤”叠加造成的。

先给结论：需求 2 值得做，但不要做成全局自动寻路。DDL 日最稳的方案是做“自动端口分配 + 线条视觉降级”，而不是复杂避障算法。

## 关键事实

当前代码并不是完全没有四向锚点：

- `src/types/index.ts` 已经有 `AnchorPosition = 'top' | 'bottom' | 'left' | 'right'`
- `ConnectionLine.tsx` 已经有 `getAnchorPosition()` 和 `getDefaultPathConfig()`
- 选中连接线时还能拖 source/target anchor

真正缺的是：

1. 多条线连到同一节点、同一边时，没有分散端口，全部落在该边中点。
2. 自动路由只按 source/target 相对位置选边，不看同一节点上的其他连接。
3. 非关键线视觉太重，导致关键路径和背景依赖线抢视觉焦点。
4. 当前 L 型折线有很多长竖线，跨泳道连接越多，画面越像“红色栅栏”。

所以需求 2 不应该描述为“从中心点改成四个连接点”，而应描述为“在已有四向锚点基础上做端口分配和重叠消解”。

## 对需求 1：节点布局优化

我不建议优先在 `prepareDemoData()` 里做一套独立 y 坐标算法。

原因：当前 `PlannerCanvas.tsx` 已经通过 `computeLayout()` 计算运行时 y，并且 `calculatedNodeById` / `renderNode` 会优先使用 layout 的 y。也就是说，修改 demo JSON 里的 `node.y` 很可能不是最终渲染位置的唯一来源。若同时存在 `prepareDemoData()` 和 `layoutEngine` 两套避让，会让问题更难定位。

建议：

1. 优先改 `layoutEngine.ts`，让真实画布和 demo 数据都受益。
2. 保留“Gate 节点同一水平线”的视觉目标，但不要强行把所有 pentagon 都挤在同一泳道第一行后再让连接线穿越全图。
3. 对泳道内节点分层建议：
   - Gate/pentagon：泳道 0 顶部固定一行。
   - Rectangle 活动：按 x 范围重叠分配到 2-4 条活动行。
   - Diamond/star 等里程碑：优先放到活动行下方或独立 milestone 行。
4. 如果只为 demo 快速交付，可以在 `prepareDemoData()` 中做数据修正，但要明确这是 demo fallback，不要替代 `layoutEngine`。

更稳的短期做法：只调整 `layoutEngine` 的行高/行距和节点类型优先级，不在两个地方同时写布局算法。

## 对需求 2：连接线锚点方向优化

值得做，但要控范围。不要做完整自动避障、不要引入寻路网格、不要写 A*。DDL 日建议做“端口分配”即可。

### 推荐实现

在 `PlannerCanvas.tsx` 渲染连接线前，基于当前 `calculatedNodeById` 和 `connections` 生成一个派生的 `connectionRouteById`，不要写回 store，不改 schema。

核心思路：

1. 对每条连接先决定 source/target 的默认 anchor：
   - 同泳道或 `abs(dx) > abs(dy) * 1.2`：右连左 / 左连右。
   - 跨泳道且 `abs(dy)` 明显更大：下连上 / 上连下。
   - 如果目标在右下方，可 source 用 right 或 bottom，target 用 left 或 top，选能减少长竖线的一组。
2. 统计每个节点每条边上有多少条连接。
3. 对同一节点同一边的第 N 条连接，给 anchor 加一个沿边方向的偏移。
   - top/bottom：沿 x 分散。
   - left/right：沿 y 分散。
4. `ConnectionLine` 接收派生 route，不保存到 `connection.pathConfig`。

建议接口：

```ts
type ConnectionRoute = {
  sourceAnchor: AnchorPosition;
  targetAnchor: AnchorPosition;
  sourceOffset: number;
  targetOffset: number;
};
```

`ConnectionLineProps` 增加：

```ts
autoRoute?: ConnectionRoute;
```

`getCurrentPathConfig()` 逻辑：

```ts
if (tempPathConfig) return tempPathConfig;
if (connection.pathConfig) return connection.pathConfig; // 手动调整优先
if (autoRoute) return {
  sourceAnchor: autoRoute.sourceAnchor,
  targetAnchor: autoRoute.targetAnchor,
  bendPoints: getDefaultBendPoints(autoRoute.sourceAnchor, autoRoute.targetAnchor),
};
return getDefaultPathConfig();
```

`getAnchorPosition(node, anchor)` 改为支持 offset：

```ts
const getAnchorPosition = (node, anchor, offset = 0) => {
  // top/bottom: x += offset
  // left/right: y += offset
}
```

端口分散参数建议：

- `PORT_GAP = 8`
- 最大偏移限制在节点宽/高范围内：`Math.min(max, (index - (count - 1) / 2) * PORT_GAP)`
- rectangle 的 top/bottom 最大偏移可用 `width / 2 - 8`
- rectangle 的 left/right 最大偏移可用 `height / 2 - 6`
- point 节点最大偏移保守一点，例如 10-14px

### 为什么这个方案适合 DDL

- 不改 ProjectData schema。
- 不破坏已有手动拖 anchor 的能力。
- 不需要改连接创建/保存逻辑。
- 对截图中的“多线汇聚同一点”会有立竿见影改善。

### 不建议做的版本

不建议做“自动避障选最短路径 + 避开所有节点 + 避开所有线”。这个复杂度高，而且一旦路由频繁变化，用户拖动节点后线会跳动，反而不稳定。

## 对需求 3：非关键路径视觉降级

强烈建议做，这是最低风险、最高收益的改动。

当前非关键线 `#374151`、2px，视觉权重太高。建议参数：

| 类型 | stroke | width | opacity/说明 |
|---|---|---:|---|
| 关键路径 | `#FF3B30` | 2.5 | 保持醒目 |
| 选中线 | `#007AFF` | 4 | 保持交互反馈 |
| 非关键 solid | `#94A3B8` | 1 | `opacity=0.38` |
| 非关键 dashed/dotted | `#94A3B8` | 1 | `opacity=0.32` |
| constraint | `#F59E0B` | 1 | `opacity=0.45`, dash |

箭头：

- 关键路径箭头保留 10px。
- 非关键路径箭头缩到 6px，或 opacity 与线一致。
- hit line 仍保持 transparent 20px，不影响点击。

另外建议连接线层级排序：

1. 非关键线先画。
2. constraint 再画。
3. 关键路径最后画。
4. 选中线可以 moveToTop 或通过渲染顺序最后画。

现在 `connections.map()` 按数组顺序画，关键线可能被普通线压住。可以在 render 前派生：

```ts
const sortedConnections = [...connections].sort((a, b) =>
  Number(Boolean(a.isCriticalPath)) - Number(Boolean(b.isCriticalPath))
);
```

这样普通线先画，关键线后画。

## 我认为遗漏的视觉问题

### 1. 长竖线太多，应优先减少跨泳道垂直贯穿

截图里最刺眼的是红色长竖线贯穿多个泳道。仅分散锚点还不够，关键路径连接也应尽量减少跨泳道折返。

短期建议：

- 对关键路径 gate-to-gate 连接，尽量保持在 Gate 行水平连接，不要穿到下方泳道再上来。
- 对 activity-to-gate 或跨泳道连接，允许 L 型，但非关键线视觉降级。

如果 demo 数据里关键路径其实是 Gate 主线，建议只把 Gate 主线标成 critical，其他依赖不要 critical。

### 2. TODAY 线和关键路径同为红色，抢视觉

截图中 TODAY 竖线也是红色，和关键路径红线混在一起。建议 TODAY 线改为：

- stroke `rgba(255, 59, 48, 0.55)`
- width 1.5
- dash `[4, 4]`
- 标签仍保持红底白字

这样它仍可见，但不会和关键路径混淆。

### 3. 连接线标签/节点文字被线穿过

当前线直接穿过大量文字，尤其 rectangle 下方 label。视觉上会很乱。短期做法：

- 非关键线 opacity 降低。
- 文字背景可保留轻微白底，或把 line layer 放在 node layer 后面：现在已经先画线后画节点，但线仍穿过节点外 label。Rectangle 默认文字在线下方，容易被连接线穿过。
- 对 rectangle 默认 label 可以加白色半透明背景或提高 `listening=false` 的小白底，但这会增形状数量，DDL 日可先不做。

### 4. 过多连接线不应该全部默认展开

如果用户主要看计划节奏，连接线可以作为辅助层。建议增加一个低风险开关或默认策略：

- 默认只高亮关键路径。
- 非关键依赖线淡显。
- 工具栏已有 connection/constraint 相关入口时，可后续加“显示全部依赖线”。

DDL 日不一定要加 UI 开关，但数据层别再通过过滤线来“修图”；应靠样式降级。

## 对你 4 个 review 问题的回答

1. 需求 2 值得做，但只做端口分散，不做完整避障。实现复杂度中等，风险可控。
2. 需求 1 更好的方案是改 `layoutEngine`，不要只改 demo 原始 y。若为 demo 快速兜底，可以在 `prepareDemoData()` 做轻量修正，但不要和运行时 layout 冲突。
3. 非关键线建议 `#94A3B8` + 1px + 0.32-0.38 opacity；关键线 `#FF3B30` + 2.5px；TODAY 线降透明或虚线。
4. 遗漏问题：TODAY 红线抢焦点、关键路径线渲染顺序、长竖线贯穿泳道、文字被线穿过、非关键依赖线不应通过删除来解决。

## 推荐执行顺序

1. 先做需求 3：非关键线视觉降级 + critical 最后渲染。
2. 再做需求 2 的端口分配：同节点同边多连接分散。
3. 再调 TODAY 线样式。
4. 最后看是否还需要节点布局优化；若需要，优先改 `layoutEngine`，demo 数据修正只做 fallback。

这套顺序能最快改善截图里的混乱感，并且不会引入大规模路由算法风险。
