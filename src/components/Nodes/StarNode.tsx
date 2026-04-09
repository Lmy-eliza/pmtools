import React, { useRef, useEffect } from 'react';
import { Group, Star, Text, Rect } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';

interface StarNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const StarNode: React.FC<StarNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<any>(null);
  const size = 25;

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
        y={-size - 18 - 2}
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
        y={-size - 18}
        width={60}
        offsetX={30}
        align="center"
      />

      {/* 选中/连线起点高亮 */}
      {(isSelected || isConnectionStart) && (
        <Rect
          x={-size - 4}
          y={-size - 4}
          width={size * 2 + 8}
          height={size * 2 + 8}
          fill="transparent"
          stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
          strokeWidth={2}
          cornerRadius={8}
          dash={isConnectionStart ? [4, 4] : undefined}
        />
      )}

      {/* 五角星主体 */}
      <Star
        numPoints={5}
        innerRadius={size * 0.4}
        outerRadius={size}
        fill={node.color}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 名称白底 */}
      <Rect
        x={-42}
        y={size + 4 - 1}
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
        y={size + 4}
        width={80}
        offsetX={40}
        align="center"
      />
    </Group>
  );
};

export default StarNode;
