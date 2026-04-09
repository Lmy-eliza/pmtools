import React, { useRef, useEffect } from 'react';
import { Group, Line, Text } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';

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

  // 内部文字区域：在矩形部分（topY 到 waistY）的中心
  const textAreaCenterY = (topY + waistY) / 2;

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
        fill={node.color}
        stroke={node.color}
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 内部文字：名称（第一行） */}
      <Text
        text={node.name}
        fontSize={11}
        fill="#1d1d1f"
        fontStyle="bold"
        y={textAreaCenterY - 8}
        width={w * 2 - 4}
        offsetX={w - 2}
        align="center"
      />

      {/* 内部文字：日期（第二行） */}
      <Text
        text={formatShortDate(node.date)}
        fontSize={10}
        fill="#374151"
        y={textAreaCenterY + 5}
        width={w * 2 - 4}
        offsetX={w - 2}
        align="center"
      />
    </Group>
  );
};

export default PentagonNode;
