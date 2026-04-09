import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';

interface RectangleNodeProps {
  node: PlanNode;
  isSelected: boolean;
  isConnectionStart: boolean;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onWidthChange?: (newWidth: number, newCenterX: number) => void;
  onLeftEdgeChange?: (newWidth: number, newCenterX: number) => void;
}

export const RectangleNode: React.FC<RectangleNodeProps> = ({
  node,
  isSelected,
  isConnectionStart,
  onClick,
  onDrag,
  onDragEnd,
  onWidthChange,
  onLeftEdgeChange,
}) => {
  const groupRef = useRef<any>(null);
  const width = node.width || 100;
  const height = 32;
  const handleWidth = 12;

  // 用于宽度调整的状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  // 记录初始的左右边缘位置（全局坐标）
  const initialLeftEdgeRef = useRef(0);
  const initialRightEdgeRef = useRef(0);
  // 记录手柄开始拖拽时的全局位置
  const handleStartGlobalXRef = useRef(0);
  // 存储stage引用
  const stageRef = useRef<any>(null);

  // 同步 Group 位置到 store 中的值（修复拖拽后位置不同步）
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

  // 处理窗口级别的鼠标移动（用于手柄拖拽）
  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !stageRef.current) return;

    // 获取stage相对于页面的位置
    const stageBox = stageRef.current.container().getBoundingClientRect();
    // 计算鼠标在画布内的位置（考虑缩放）
    const scale = stageRef.current.scaleX();
    const pointerX = (e.clientX - stageBox.left) / scale;

    if (resizingSide === 'right' && onWidthChange) {
      // 右侧手柄：左边缘保持不变
      const deltaX = pointerX - handleStartGlobalXRef.current;
      const leftEdge = initialLeftEdgeRef.current;
      const newRightEdge = initialRightEdgeRef.current + deltaX;
      const newWidth = Math.max(60, newRightEdge - leftEdge);
      const newCenterX = leftEdge + newWidth / 2;
      onWidthChange(newWidth, newCenterX);
    } else if (resizingSide === 'left' && onLeftEdgeChange) {
      // 左侧手柄：右边缘保持不变
      const deltaX = pointerX - handleStartGlobalXRef.current;
      const newLeftEdge = initialLeftEdgeRef.current + deltaX;
      const rightEdge = initialRightEdgeRef.current;
      const newWidth = Math.max(60, rightEdge - newLeftEdge);
      const newCenterX = newLeftEdge + newWidth / 2;
      onLeftEdgeChange(newWidth, newCenterX);
    }
  }, [isResizing, resizingSide, onWidthChange, onLeftEdgeChange]);

  // 处理窗口级别的鼠标释放
  const handleWindowMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizingSide(null);
    }
  }, [isResizing]);

  // 添加和移除窗口事件监听器
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isResizing, handleWindowMouseMove, handleWindowMouseUp]);

  // 格式化起止日期显示
  const dateText = node.endDate
    ? `${formatShortDate(node.date)} - ${formatShortDate(node.endDate)}`
    : formatShortDate(node.date);

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable={!isResizing}  // 调整宽度时禁用整体拖拽
      onClick={onClick}
      onTap={onClick}
      onDragMove={(e) => {
        if (isResizing) return;  // 调整宽度时不移动
        const pos = e.target.position();
        onDrag(pos.x, pos.y);
      }}
      onDragEnd={(e) => {
        if (isResizing) return;
        const pos = e.target.position();
        onDragEnd(pos.x, pos.y);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* 日期白底 */}
      <Rect
        x={-(width + 40) / 2 + 10}
        y={-height / 2 - 18 - 2}
        width={width + 20}
        height={14}
        fill="rgba(255,255,255,0.85)"
        cornerRadius={3}
      />
      {/* 起止日期显示在节点上方 */}
      <Text
        text={dateText}
        fontSize={10}
        fill="#6b7280"
        y={-height / 2 - 18}
        width={width + 40}
        offsetX={(width + 40) / 2}
        align="center"
      />

      {/* 选中/连线起点高亮 */}
      {(isSelected || isConnectionStart) && (
        <Rect
          x={-width / 2 - 4}
          y={-height / 2 - 4}
          width={width + 8}
          height={height + 8}
          fill="transparent"
          stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
          strokeWidth={2}
          cornerRadius={10}
          dash={isConnectionStart ? [4, 4] : undefined}
        />
      )}

      {/* 长方形主体 */}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={node.color}
        cornerRadius={6}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* 节点名称 */}
      <Text
        text={node.name}
        fontSize={12}
        fill="#ffffff"
        x={-width / 2 + (isSelected ? handleWidth : 0)}
        y={-height / 2}
        width={width - (isSelected ? handleWidth * 2 : 0)}
        height={height}
        align="center"
        verticalAlign="middle"
        fontStyle="500"
      />

      {/* 左侧宽度调整手柄 */}
      {isSelected && onLeftEdgeChange && (
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={handleWidth}
          height={height}
          fill="rgba(0, 122, 255, 0.3)"
          cornerRadius={[6, 0, 0, 6]}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            setIsResizing(true);
            setResizingSide('left');
            // 记录右边缘的全局位置（保持不变）
            initialRightEdgeRef.current = node.x + width / 2;
            // 记录左边缘的初始全局位置
            initialLeftEdgeRef.current = node.x - width / 2;
            // 使用 Stage 的相对指针位置（已考虑缩放和偏移）
            const stage = e.target.getStage();
            stageRef.current = stage;
            const pos = stage?.getRelativePointerPosition();
            if (pos) {
              handleStartGlobalXRef.current = pos.x;
            }
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'ew-resize';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }
          }}
        />
      )}

      {/* 左侧手柄指示条（选中时可见） */}
      {isSelected && onLeftEdgeChange && (
        <Rect
          x={-width / 2 + 2}
          y={-height / 4}
          width={2}
          height={height / 2}
          fill="rgba(255, 255, 255, 0.8)"
          cornerRadius={1}
          listening={false}
        />
      )}

      {/* 右侧宽度调整手柄 */}
      {isSelected && onWidthChange && (
        <Rect
          x={width / 2 - handleWidth}
          y={-height / 2}
          width={handleWidth}
          height={height}
          fill="rgba(0, 122, 255, 0.3)"
          cornerRadius={[0, 6, 6, 0]}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            setIsResizing(true);
            setResizingSide('right');
            // 记录左边缘的全局位置（保持不变）
            initialLeftEdgeRef.current = node.x - width / 2;
            // 记录右边缘的初始全局位置
            initialRightEdgeRef.current = node.x + width / 2;
            // 使用 Stage 的相对指针位置（已考虑缩放和偏移）
            const stage = e.target.getStage();
            stageRef.current = stage;
            const pos = stage?.getRelativePointerPosition();
            if (pos) {
              handleStartGlobalXRef.current = pos.x;
            }
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'ew-resize';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }
          }}
        />
      )}

      {/* 调整手柄指示条（选中时可见） */}
      {isSelected && onWidthChange && (
        <Rect
          x={width / 2 - 4}
          y={-height / 4}
          width={2}
          height={height / 2}
          fill="rgba(255, 255, 255, 0.8)"
          cornerRadius={1}
          listening={false}
        />
      )}
    </Group>
  );
};

export default RectangleNode;
