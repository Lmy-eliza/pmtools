import React, { useRef, useEffect } from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';

interface PentagonNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const PentagonNode: React.FC<PentagonNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<any>(null);

  // 同步 Group 位置到 store 中的值
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

  // Homeplate 尺寸：瘦高比例
  const w = 20;    // 半宽（缩窄）
  const topY = -24; // 顶部 Y（从中心往上）
  const waistY = 8; // 腰部 Y（从中心往下，斜边开始处）
  const tipY = 22;  // 底部尖角 Y

  // 五边形顶点（视觉中心在原点 0,0）
  const pentagonPoints = [
    -w, topY,       // 左上角
    w, topY,        // 右上角
    w, waistY,      // 右腰
    0, tipY,        // 底部尖角
    -w, waistY,     // 左腰
  ].flat();

  // 选中高亮（稍大）
  const pad = 4;
  const highlightPoints = [
    -(w + pad), topY - pad,
    (w + pad), topY - pad,
    (w + pad), waistY + pad * 0.5,
    0, tipY + pad,
    -(w + pad), waistY + pad * 0.5,
  ].flat();

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable
      onClick={onClick}
      onTap={onClick}
      onDragMove={(e) => {
        const pos = e.target.position();
        onDrag(pos.x, pos.y);
      }}
      onDragEnd={(e) => {
        const pos = e.target.position();
        onDragEnd(pos.x, pos.y);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* 日期白底 — 移到尖角下方 */}
      <Rect
        x={-32}
        y={tipY + 4}
        width={64}
        height={14}
        fill="rgba(255,255,255,0.85)"
        cornerRadius={3}
      />
      <Text
        text={formatShortDate(node.date)}
        fontSize={10}
        fill="#6b7280"
        y={tipY + 5}
        width={60}
        offsetX={30}
        align="center"
      />

      {/* 选中/连线起点高亮 */}
      {(isSelected || isConnectionStart) && (
        <Line
          points={highlightPoints}
          closed
          fill="transparent"
          stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
          strokeWidth={2}
          dash={isConnectionStart ? [4, 4] : undefined}
        />
      )}

      {/* 五边形主体 */}
      <Line
        points={pentagonPoints}
        closed
        fill={getStatusColor(node.color, node.status)}
        stroke={getStatusColor(node.color, node.status)}
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 节点名称 — 在五边形矩形体内居中 */}
      <Text
        text={node.name}
        fontSize={node.name.length > 5 ? 8 : 10}
        fill="#ffffff"
        x={-w + 2}
        y={topY + 2}
        width={(w - 2) * 2}
        height={waistY - topY - 4}
        align="center"
        verticalAlign="middle"
        wrap="char"
        fontStyle="bold"
      />
    </Group>
  );
};

export default PentagonNode;
