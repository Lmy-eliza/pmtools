import React, { useRef, useEffect } from 'react';
import { Group, Circle as KonvaCircle, Text, Rect } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';

interface CircleNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const CircleNode: React.FC<CircleNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<any>(null);
  const radius = 20;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

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
    >
      {/* 日期白底 */}
      <Rect
        x={-32}
        y={-radius - 18 - 2}
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
        y={-radius - 18}
        width={60}
        offsetX={30}
        align="center"
      />

      {/* 选中/连线起点高亮 */}
      {(isSelected || isConnectionStart) && (
        <KonvaCircle
          radius={radius + 6}
          fill="transparent"
          stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
          strokeWidth={2}
          dash={isConnectionStart ? [4, 4] : undefined}
        />
      )}

      {/* 圆形主体 */}
      <KonvaCircle
        radius={radius}
        fill={getStatusColor(node.color, node.status)}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 名称白底 */}
      <Rect
        x={-42}
        y={radius + 4 - 1}
        width={84}
        height={16}
        fill="rgba(255,255,255,0.85)"
        cornerRadius={3}
      />
      {/* 节点名称 */}
      <Text
        text={node.name}
        fontSize={11}
        fill="#374151"
        y={radius + 4}
        width={80}
        offsetX={40}
        align="center"
      />
    </Group>
  );
};

export default CircleNode;
