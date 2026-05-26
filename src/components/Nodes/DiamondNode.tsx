import React, { useRef, useEffect } from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';

interface DiamondNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const DiamondNode: React.FC<DiamondNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<any>(null);

  // 同步 Group 位置到 store 中的值（修复拖拽后位置不同步）
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

  // 菱形尺寸：宽度大于高度，形成扁平的菱形
  const diamondWidth = 30;
  const diamondHeight = 20;

  // 菱形顶点（相对于中心）
  const diamondPoints = [
    0, -diamondHeight,           // 上顶点
    diamondWidth, 0,             // 右顶点
    0, diamondHeight,            // 下顶点
    -diamondWidth, 0,            // 左顶点
  ];

  // 选中/连线高亮的菱形（稍大）
  const highlightWidth = diamondWidth + 6;
  const highlightHeight = diamondHeight + 4;
  const highlightPoints = [
    0, -highlightHeight,
    highlightWidth, 0,
    0, highlightHeight,
    -highlightWidth, 0,
  ];

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
      {/* 日期白底 */}
      <Rect
        x={-32}
        y={-diamondHeight - 18 - 2}
        width={64}
        height={14}
        fill="rgba(255,255,255,0.85)"
        cornerRadius={3}
      />
      {/* 日期显示在节点上方 */}
      <Text
        text={formatShortDate(node.date)}
        fontSize={10}
        fill="#6b7280"
        y={-diamondHeight - 18}
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

      {/* 菱形主体 */}
      <Line
        points={diamondPoints}
        closed
        fill={getStatusColor(node.color, node.status)}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 名称白底 */}
      <Rect
        x={-42}
        y={diamondHeight + 8 - 1}
        width={84}
        height={16}
        fill="rgba(255,255,255,0.85)"
        cornerRadius={3}
      />
      {/* 节点名称 */}
      <Text
        text={node.name}
        fontSize={11}
        fill="#1d1d1f"
        y={diamondHeight + 8}
        width={80}
        offsetX={40}
        align="center"
        fontStyle="500"
      />
    </Group>
  );
};

export default DiamondNode;
