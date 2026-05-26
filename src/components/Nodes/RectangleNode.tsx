import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { formatShortDate } from '../../utils/dateUtils';
import type { PlanNode } from '../../types';
import { getStatusColor } from '../../utils/statusUtils';

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
  const selectedHeight = 32;
  const capsuleHeight = 16;
  const handleWidth = 12;

  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  const initialLeftEdgeRef = useRef(0);
  const initialRightEdgeRef = useRef(0);
  const handleStartGlobalXRef = useRef(0);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: node.x, y: node.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [node.x, node.y]);

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !stageRef.current) return;

    const stageBox = stageRef.current.container().getBoundingClientRect();
    const scale = stageRef.current.scaleX();
    const pointerX = (e.clientX - stageBox.left) / scale;

    if (resizingSide === 'right' && onWidthChange) {
      const deltaX = pointerX - handleStartGlobalXRef.current;
      const leftEdge = initialLeftEdgeRef.current;
      const newRightEdge = initialRightEdgeRef.current + deltaX;
      const newWidth = Math.max(60, newRightEdge - leftEdge);
      const newCenterX = leftEdge + newWidth / 2;
      onWidthChange(newWidth, newCenterX);
    } else if (resizingSide === 'left' && onLeftEdgeChange) {
      const deltaX = pointerX - handleStartGlobalXRef.current;
      const newLeftEdge = initialLeftEdgeRef.current + deltaX;
      const rightEdge = initialRightEdgeRef.current;
      const newWidth = Math.max(60, rightEdge - newLeftEdge);
      const newCenterX = newLeftEdge + newWidth / 2;
      onLeftEdgeChange(newWidth, newCenterX);
    }
  }, [isResizing, resizingSide, onWidthChange, onLeftEdgeChange]);

  const handleWindowMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizingSide(null);
    }
  }, [isResizing]);

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

  const fillColor = getStatusColor(node.color, node.status);

  const dateText = node.endDate
    ? `${formatShortDate(node.date)} - ${formatShortDate(node.endDate)}`
    : formatShortDate(node.date);

  const renderMode: 'selected' | 'hover' | 'default' =
    isSelected ? 'selected' : isHovered ? 'hover' : 'default';

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable={!isResizing}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { if (!isResizing) setIsHovered(false); }}
      onDragMove={(e) => {
        if (isResizing) return;
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
      {/* 透明命中区域 — 保证 hover/click 检测一致 */}
      <Rect
        x={-width / 2}
        y={-selectedHeight / 2}
        width={width}
        height={selectedHeight}
        fill="transparent"
      />

      {/* ===== 默认态：细线段 + 名称 ===== */}
      {renderMode === 'default' && (
        <>
          <Text
            text={node.name}
            fontSize={10}
            fill="#374151"
            x={-width / 2}
            y={-12}
            width={width}
            align="left"
            fontStyle="500"
          />
          <Line
            points={[-width / 2, 2, width / 2, 2]}
            stroke={fillColor}
            strokeWidth={2}
          />
          <Circle x={-width / 2} y={2} radius={3} fill={fillColor} />
          <Circle x={width / 2} y={2} radius={3} fill={fillColor} />

          {isConnectionStart && (
            <Rect
              x={-width / 2 - 4}
              y={-16}
              width={width + 8}
              height={24}
              fill="transparent"
              stroke="#FF9500"
              strokeWidth={2}
              cornerRadius={6}
              dash={[4, 4]}
            />
          )}
        </>
      )}

      {/* ===== Hover 态：胶囊 + 日期 ===== */}
      {renderMode === 'hover' && (
        <>
          <Rect
            x={-width / 2}
            y={-capsuleHeight / 2}
            width={width}
            height={capsuleHeight}
            fill={fillColor}
            cornerRadius={capsuleHeight / 2}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={4}
            shadowOffset={{ x: 0, y: 1 }}
          />
          <Text
            text={node.name}
            fontSize={11}
            fill="#ffffff"
            x={-width / 2 + 8}
            y={-capsuleHeight / 2}
            width={width - 16}
            height={capsuleHeight}
            align="center"
            verticalAlign="middle"
            fontStyle="500"
          />
          <Text
            text={dateText}
            fontSize={9}
            fill="#9ca3af"
            x={-width / 2}
            y={capsuleHeight / 2 + 2}
            width={width}
            align="center"
          />

          {isConnectionStart && (
            <Rect
              x={-width / 2 - 4}
              y={-capsuleHeight / 2 - 4}
              width={width + 8}
              height={capsuleHeight + 8}
              fill="transparent"
              stroke="#FF9500"
              strokeWidth={2}
              cornerRadius={capsuleHeight / 2 + 4}
              dash={[4, 4]}
            />
          )}
        </>
      )}

      {/* ===== 选中态：完整矩形 + 拖拽手柄 ===== */}
      {renderMode === 'selected' && (
        <>
          {/* 日期白底 */}
          {(() => {
            const dateW = dateText.length * 7 + 16;
            return (
              <>
                <Rect
                  x={-dateW / 2}
                  y={-selectedHeight / 2 - 18 - 2}
                  width={dateW}
                  height={14}
                  fill="rgba(255,255,255,0.85)"
                  cornerRadius={3}
                />
                <Text
                  text={dateText}
                  fontSize={10}
                  fill="#6b7280"
                  y={-selectedHeight / 2 - 18}
                  width={dateW}
                  offsetX={dateW / 2}
                  align="center"
                />
              </>
            );
          })()}

          {/* 选中/连线高亮 */}
          <Rect
            x={-width / 2 - 4}
            y={-selectedHeight / 2 - 4}
            width={width + 8}
            height={selectedHeight + 8}
            fill="transparent"
            stroke={isConnectionStart ? '#FF9500' : '#007AFF'}
            strokeWidth={2}
            cornerRadius={10}
            dash={isConnectionStart ? [4, 4] : undefined}
          />

          {/* 矩形主体 */}
          <Rect
            x={-width / 2}
            y={-selectedHeight / 2}
            width={width}
            height={selectedHeight}
            fill={fillColor}
            cornerRadius={6}
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={4}
            shadowOffset={{ x: 0, y: 2 }}
          />

          {/* 名称 */}
          <Text
            text={node.name}
            fontSize={12}
            fill="#ffffff"
            x={-width / 2 + (onLeftEdgeChange ? handleWidth : 0)}
            y={-selectedHeight / 2}
            width={width - (onLeftEdgeChange ? handleWidth : 0) - (onWidthChange ? handleWidth : 0)}
            height={selectedHeight}
            align="center"
            verticalAlign="middle"
            fontStyle="500"
          />

          {/* 左侧宽度调整手柄 */}
          {onLeftEdgeChange && (
            <>
              <Rect
                x={-width / 2}
                y={-selectedHeight / 2}
                width={handleWidth}
                height={selectedHeight}
                fill="rgba(0, 122, 255, 0.3)"
                cornerRadius={[6, 0, 0, 6]}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setIsResizing(true);
                  setResizingSide('left');
                  initialRightEdgeRef.current = node.x + width / 2;
                  initialLeftEdgeRef.current = node.x - width / 2;
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
              <Rect
                x={-width / 2 + 2}
                y={-selectedHeight / 4}
                width={2}
                height={selectedHeight / 2}
                fill="rgba(255, 255, 255, 0.8)"
                cornerRadius={1}
                listening={false}
              />
            </>
          )}

          {/* 右侧宽度调整手柄 */}
          {onWidthChange && (
            <>
              <Rect
                x={width / 2 - handleWidth}
                y={-selectedHeight / 2}
                width={handleWidth}
                height={selectedHeight}
                fill="rgba(0, 122, 255, 0.3)"
                cornerRadius={[0, 6, 6, 0]}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setIsResizing(true);
                  setResizingSide('right');
                  initialLeftEdgeRef.current = node.x - width / 2;
                  initialRightEdgeRef.current = node.x + width / 2;
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
              <Rect
                x={width / 2 - 4}
                y={-selectedHeight / 4}
                width={2}
                height={selectedHeight / 2}
                fill="rgba(255, 255, 255, 0.8)"
                cornerRadius={1}
                listening={false}
              />
            </>
          )}
        </>
      )}
    </Group>
  );
};

export default RectangleNode;
