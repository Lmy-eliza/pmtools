import type { PlanNode, Swimlane, CanvasSettings, TimelineView } from '../types';
import { dateToX } from './dateUtils';

const NODE_ROW_HEIGHT = 28;
const SWIMLANE_PADDING = 16;
const POINT_NODE_HALF_WIDTH = 25;

export interface LayoutResult {
  swimlaneHeights: Map<string, number>;
  swimlaneTopYs: Map<string, number>;
  nodeYPositions: Map<string, number>;
  totalHeight: number;
}

interface NodeRange {
  nodeId: string;
  left: number;
  right: number;
}

interface OverlapGroup {
  members: NodeRange[];
}

function computeOverlapGroups(
  nodes: PlanNode[],
  swimlaneId: string,
  startDate: Date,
  unitWidth: number,
  timelineView: TimelineView,
): OverlapGroup[] {
  const laneNodes = nodes.filter(n => n.swimlaneId === swimlaneId);
  if (laneNodes.length === 0) return [];

  const ranges: NodeRange[] = laneNodes.map(node => {
    if (node.type === 'rectangle') {
      const leftX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
      const rightX = leftX + (node.width || 100);
      return { nodeId: node.id, left: leftX, right: rightX };
    }
    const centerX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
    return {
      nodeId: node.id,
      left: centerX - POINT_NODE_HALF_WIDTH,
      right: centerX + POINT_NODE_HALF_WIDTH,
    };
  });

  ranges.sort((a, b) => a.left - b.left);

  const groups: OverlapGroup[] = [];
  let currentGroup: NodeRange[] = [ranges[0]];
  let maxRight = ranges[0].right;

  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].left < maxRight) {
      currentGroup.push(ranges[i]);
      maxRight = Math.max(maxRight, ranges[i].right);
    } else {
      groups.push({ members: currentGroup });
      currentGroup = [ranges[i]];
      maxRight = ranges[i].right;
    }
  }
  groups.push({ members: currentGroup });

  return groups;
}

export function computeLayout(
  nodes: PlanNode[],
  swimlanes: Swimlane[],
  settings: CanvasSettings,
  startDate: Date,
  unitWidth: number,
  timelineView: TimelineView,
  headerHeight: number,
): LayoutResult {
  const swimlaneHeights = new Map<string, number>();
  const swimlaneTopYs = new Map<string, number>();
  const nodeYPositions = new Map<string, number>();
  const minHeight = settings.swimlaneHeight;

  let currentY = headerHeight;

  for (const swimlane of swimlanes) {
    const groups = computeOverlapGroups(
      nodes, swimlane.id, startDate, unitWidth, timelineView,
    );

    const maxOverlap = groups.length > 0
      ? Math.max(...groups.map(g => g.members.length))
      : 0;

    const height = maxOverlap <= 1
      ? minHeight
      : Math.max(minHeight, maxOverlap * NODE_ROW_HEIGHT + SWIMLANE_PADDING * 2);

    swimlaneHeights.set(swimlane.id, height);
    swimlaneTopYs.set(swimlane.id, currentY);

    const centerY = currentY + height / 2;

    for (const group of groups) {
      const n = group.members.length;
      if (n === 1) {
        nodeYPositions.set(group.members[0].nodeId, centerY);
      } else {
        const availableHeight = height - SWIMLANE_PADDING * 2;
        const gap = availableHeight / (n + 1);
        const sorted = [...group.members].sort((a, b) => a.left - b.left);
        for (let i = 0; i < n; i++) {
          const y = currentY + SWIMLANE_PADDING + gap * (i + 1);
          nodeYPositions.set(sorted[i].nodeId, y);
        }
      }
    }

    currentY += height;
  }

  return {
    swimlaneHeights,
    swimlaneTopYs,
    nodeYPositions,
    totalHeight: currentY,
  };
}

export function findSwimlaneAtY(
  y: number,
  swimlanes: Swimlane[],
  layout: LayoutResult,
): number {
  for (let i = 0; i < swimlanes.length; i++) {
    const topY = layout.swimlaneTopYs.get(swimlanes[i].id) ?? 0;
    const height = layout.swimlaneHeights.get(swimlanes[i].id) ?? 120;
    if (y >= topY && y < topY + height) return i;
  }
  if (swimlanes.length === 0) return 0;
  const lastTop = layout.swimlaneTopYs.get(swimlanes[swimlanes.length - 1].id) ?? 0;
  const lastH = layout.swimlaneHeights.get(swimlanes[swimlanes.length - 1].id) ?? 120;
  return y < (layout.swimlaneTopYs.get(swimlanes[0].id) ?? 0) ? 0
    : y >= lastTop + lastH ? swimlanes.length - 1
    : 0;
}
