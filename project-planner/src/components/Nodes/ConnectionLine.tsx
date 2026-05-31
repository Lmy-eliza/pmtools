import React, { useState, useCallback, useMemo } from 'react';
import { Group, Text, Line, Circle, Rect } from 'react-konva';
import { differenceInDays } from 'date-fns';
import { useCanvasStore } from '../../stores/canvasStore';
import type { Connection, PlanNode, AnchorPosition, ConnectionPathConfig } from '../../types';

interface ConnectionLineProps {
  connection: Connection;
  sourceNode: PlanNode;
  targetNode: PlanNode;
  showInterval: boolean;
  isConstraintLine?: boolean; // 是否为约束线
  verticalOffset?: number; // 垂直偏移，用于错开显示
  constraintOffsetMonths?: number; // 约束的间隔月数
  isSelected?: boolean;  // 是否选中
  onClick?: (e?: any) => void;  // 点击回调，问题14：传递事件对象支持Ctrl检测
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  sourceNode,
  targetNode,
  showInterval,
  isConstraintLine = false,
  verticalOffset: _verticalOffset = 0,  // 保留接口兼容性，L形折线不需要此偏移
  constraintOffsetMonths,
  isSelected = false,
  onClick,
}) => {
  const { settings, updateConnectionPath, updateConnectionLabelOffset, updateConstraintLabelOffset } = useCanvasStore();
  const isDashed = connection.style === 'dashed';
  const isCriticalPath = connection.isCriticalPath;

  // 拖拽状态
  const [_isDragging, setIsDragging] = useState(false);
  const [tempPathConfig, setTempPathConfig] = useState<ConnectionPathConfig | null>(null);

  // 获取节点尺寸
  const getNodeDimensions = (node: PlanNode) => {
    const width = node.type === 'rectangle' ? (node.width || 100) : 40;
    const height = node.type === 'rectangle' ? 32 : 40;
    return { width, height };
  };

  // 获取锚点位置
  const getAnchorPosition = (node: PlanNode, anchor: AnchorPosition) => {
    const { width, height } = getNodeDimensions(node);
    const GAP = 3;

    switch (anchor) {
      case 'top':
        return { x: node.x, y: node.y - height / 2 - GAP };
      case 'bottom':
        return { x: node.x, y: node.y + height / 2 + GAP };
      case 'left':
        return { x: node.x - width / 2 - GAP, y: node.y };
      case 'right':
        return { x: node.x + width / 2 + GAP, y: node.y };
    }
  };

  // 根据拖拽位置获取最近的锚点
  const getClosestAnchor = (
    node: PlanNode,
    dragX: number,
    dragY: number
  ): AnchorPosition => {
    const { width, height } = getNodeDimensions(node);

    const distToTop = Math.abs(dragY - (node.y - height / 2));
    const distToBottom = Math.abs(dragY - (node.y + height / 2));
    const distToLeft = Math.abs(dragX - (node.x - width / 2));
    const distToRight = Math.abs(dragX - (node.x + width / 2));

    const min = Math.min(distToTop, distToBottom, distToLeft, distToRight);
    if (min === distToTop) return 'top';
    if (min === distToBottom) return 'bottom';
    if (min === distToLeft) return 'left';
    return 'right';
  };

  // 获取默认路径配置
  const getDefaultPathConfig = useCallback((): ConnectionPathConfig => {
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;

    // 同泳道（水平连接）
    if (Math.abs(dy) < 10) {
      return {
        sourceAnchor: dx > 0 ? 'right' : 'left',
        targetAnchor: dx > 0 ? 'left' : 'right',
      };
    }

    // 跨泳道（L 形连接）
    return {
      sourceAnchor: dy > 0 ? 'bottom' : 'top',
      targetAnchor: dx > 0 ? 'left' : 'right',
      bendPoints: [{ rx: 0, ry: 1 }],  // 转折点在源节点正下方，目标行高度
    };
  }, [sourceNode, targetNode]);

  // 获取当前路径配置
  const getCurrentPathConfig = (): ConnectionPathConfig => {
    if (tempPathConfig) return tempPathConfig;
    return connection.pathConfig || getDefaultPathConfig();
  };

  // 计算路径点
  const calculatePath = () => {
    const config = getCurrentPathConfig();

    // 获取锚点位置
    const startPos = getAnchorPosition(sourceNode, config.sourceAnchor);
    const endPos = getAnchorPosition(targetNode, config.targetAnchor);

    // 约束线的垂直偏移
    const yOffset = isConstraintLine ? -8 : 0;

    // 没有转折点：直线
    if (!config.bendPoints || config.bendPoints.length === 0) {
      return [startPos.x, startPos.y + yOffset, endPos.x, endPos.y + yOffset];
    }

    // 有转折点：折线
    const points: number[] = [startPos.x, startPos.y + yOffset];
    for (const bp of config.bendPoints) {
      // 转折点使用相对坐标，转换为绝对坐标
      const absX = startPos.x + (endPos.x - startPos.x) * bp.rx;
      const absY = startPos.y + (endPos.y - startPos.y) * bp.ry;
      points.push(absX, absY + yOffset);
    }
    points.push(endPos.x, endPos.y + yOffset);

    return points;
  };

  const points = calculatePath();
  const config = getCurrentPathConfig();

  // 获取控制点位置
  const sourceAnchorPos = getAnchorPosition(sourceNode, config.sourceAnchor);
  const targetAnchorPos = getAnchorPosition(targetNode, config.targetAnchor);

  // 计算转折点绝对位置
  const getBendPointPositions = () => {
    if (!config.bendPoints || config.bendPoints.length === 0) return [];

    const startPos = sourceAnchorPos;
    const endPos = targetAnchorPos;

    return config.bendPoints.map(bp => ({
      x: startPos.x + (endPos.x - startPos.x) * bp.rx,
      y: startPos.y + (endPos.y - startPos.y) * bp.ry,
    }));
  };

  const bendPointPositions = getBendPointPositions();

  // 计算标签默认位置：在最长线段的中点
  const labelPositionInfo = useMemo(() => {
    if (points.length < 4) {
      return {
        x: sourceNode.x,
        y: sourceNode.y - 20,
        isHorizontal: true,
        minX: sourceNode.x - 50,
        maxX: sourceNode.x + 50,
      };
    }

    // 找最长的线段
    let maxLength = 0;
    let bestSegment = { x1: points[0], y1: points[1], x2: points[2], y2: points[3] };

    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i], y1 = points[i + 1];
      const x2 = points[i + 2], y2 = points[i + 3];
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

      if (length > maxLength) {
        maxLength = length;
        bestSegment = { x1, y1, x2, y2 };
      }
    }

    // 判断最长线段是水平还是垂直
    const isHorizontal = Math.abs(bestSegment.y1 - bestSegment.y2) < Math.abs(bestSegment.x1 - bestSegment.x2);

    // 返回最长线段的中点及其他信息
    return {
      x: (bestSegment.x1 + bestSegment.x2) / 2,
      y: (bestSegment.y1 + bestSegment.y2) / 2,
      isHorizontal,
      minX: Math.min(points[0], points[points.length - 2]),
      maxX: Math.max(points[0], points[points.length - 2]),
      segment: bestSegment,
    };
  }, [points, sourceNode.x, sourceNode.y]);

  // 获取标签偏移
  const labelOffset = connection.labelOffset || { x: 0, y: 0 };

  // 计算标签实际位置
  const labelX = labelPositionInfo.x + labelOffset.x;
  // 智能位置调整：水平线标签在上方，垂直线标签在旁边
  const labelOffsetY = labelPositionInfo.isHorizontal ? -16 : 0;
  const labelOffsetX = labelPositionInfo.isHorizontal ? 0 : 20;
  const labelY = labelPositionInfo.y + labelOffset.y + labelOffsetY;

  // 标签拖拽处理
  const handleLabelDragEnd = useCallback((e: any) => {
    const pos = e.target.position();
    const newOffset = {
      x: pos.x - labelPositionInfo.x - labelOffsetX,
      y: 0  // 只允许横向移动
    };

    // 限制在连接线范围内
    const minX = labelPositionInfo.minX - labelPositionInfo.x - 30;
    const maxX = labelPositionInfo.maxX - labelPositionInfo.x + 30;
    newOffset.x = Math.max(minX, Math.min(maxX, newOffset.x));

    // 根据类型更新到不同的 store
    if (isConstraintLine) {
      updateConstraintLabelOffset(connection.id, newOffset);
    } else {
      updateConnectionLabelOffset(connection.id, newOffset);
    }
  }, [connection.id, isConstraintLine, labelPositionInfo, labelOffsetX, updateConnectionLabelOffset, updateConstraintLabelOffset]);

  // 源锚点拖拽处理
  const handleSourceAnchorDrag = useCallback((e: any) => {
    const pos = e.target.position();
    const newAnchor = getClosestAnchor(sourceNode, pos.x, pos.y);
    const currentConfig = connection.pathConfig || getDefaultPathConfig();

    setTempPathConfig({
      ...currentConfig,
      sourceAnchor: newAnchor,
    });
    setIsDragging(true);
  }, [sourceNode, connection.pathConfig, getDefaultPathConfig]);

  const handleSourceAnchorDragEnd = useCallback(() => {
    if (tempPathConfig) {
      updateConnectionPath(connection.id, tempPathConfig);
    }
    setTempPathConfig(null);
    setIsDragging(false);
  }, [connection.id, tempPathConfig, updateConnectionPath]);

  // 目标锚点拖拽处理
  const handleTargetAnchorDrag = useCallback((e: any) => {
    const pos = e.target.position();
    const newAnchor = getClosestAnchor(targetNode, pos.x, pos.y);
    const currentConfig = connection.pathConfig || getDefaultPathConfig();

    setTempPathConfig({
      ...currentConfig,
      targetAnchor: newAnchor,
    });
    setIsDragging(true);
  }, [targetNode, connection.pathConfig, getDefaultPathConfig]);

  const handleTargetAnchorDragEnd = useCallback(() => {
    if (tempPathConfig) {
      updateConnectionPath(connection.id, tempPathConfig);
    }
    setTempPathConfig(null);
    setIsDragging(false);
  }, [connection.id, tempPathConfig, updateConnectionPath]);

  // 转折点拖拽处理
  const handleBendPointDrag = useCallback((index: number, e: any) => {
    const pos = e.target.position();
    const currentConfig = connection.pathConfig || getDefaultPathConfig();

    const startPos = getAnchorPosition(sourceNode, currentConfig.sourceAnchor);
    const endPos = getAnchorPosition(targetNode, currentConfig.targetAnchor);

    // 计算新的相对坐标
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;

    const newRx = dx !== 0 ? (pos.x - startPos.x) / dx : 0;
    const newRy = dy !== 0 ? (pos.y - startPos.y) / dy : 0;

    const newBendPoints = [...(currentConfig.bendPoints || [])];
    newBendPoints[index] = { rx: newRx, ry: newRy };

    setTempPathConfig({
      ...currentConfig,
      bendPoints: newBendPoints,
    });
    setIsDragging(true);
  }, [sourceNode, targetNode, connection.pathConfig, getDefaultPathConfig]);

  const handleBendPointDragEnd = useCallback(() => {
    if (tempPathConfig) {
      updateConnectionPath(connection.id, tempPathConfig);
    }
    setTempPathConfig(null);
    setIsDragging(false);
  }, [connection.id, tempPathConfig, updateConnectionPath]);

  // 计算时间间隔（使用天数，然后根据设置转换）
  const daysDiff = differenceInDays(targetNode.date, sourceNode.date);

  // 根据设置转换单位
  const formatInterval = () => {
    // 如果是约束线且有预设的间隔月数，使用该值
    if (isConstraintLine && constraintOffsetMonths !== undefined) {
      let value: number;
      let unitLabel: string;

      switch (settings.intervalUnit) {
        case 'day':
          value = constraintOffsetMonths * 30;
          unitLabel = '天';
          break;
        case 'week':
          value = constraintOffsetMonths * 4.33;
          unitLabel = '周';
          break;
        default: // month
          value = constraintOffsetMonths;
          unitLabel = '月';
      }

      return `${Math.abs(value).toFixed(settings.intervalDecimals)}${unitLabel}`;
    }

    // 普通连接线使用实际日期差
    let value: number;
    let unitLabel: string;

    switch (settings.intervalUnit) {
      case 'day':
        value = daysDiff;
        unitLabel = '天';
        break;
      case 'week':
        value = daysDiff / 7;
        unitLabel = '周';
        break;
      default: // month
        value = daysDiff / 30;
        unitLabel = '月';
    }

    return `${Math.abs(value).toFixed(settings.intervalDecimals)}${unitLabel}`;
  };

  // 确定线条颜色（需求10：关键路径为红色，选中时高亮）
  const lineColor = isSelected
    ? '#007AFF' // 选中状态为蓝色
    : isCriticalPath
      ? '#FF3B30' // 红色关键路径
      : isDashed
        ? '#9ca3af'
        : '#374151';

  // 选中时的线条宽度
  const lineWidth = isSelected ? 4 : (isCriticalPath ? 3 : 2);

  return (
    <Group onClick={(e) => onClick?.(e)} onTap={(e) => onClick?.(e)}>
      {/* 透明的宽点击区域，便于选中 */}
      <Line
        points={points}
        stroke="transparent"
        strokeWidth={20}
        hitStrokeWidth={20}
      />
      {/* 连接线 - 使用 Line 绘制折线 */}
      <Line
        points={points}
        stroke={lineColor}
        strokeWidth={lineWidth}
        dash={isDashed ? [6, 4] : undefined}
      />

      {/* 箭头 - 在终点绘制（约束线无箭头，需求7） */}
      {!isConstraintLine && (
        <Line
          points={calculateArrowPoints(points)}
          fill={lineColor}
          stroke={lineColor}
          strokeWidth={1}
          closed
        />
      )}

      {/* 选中时显示控制点 */}
      {isSelected && !isConstraintLine && (
        <>
          {/* 源锚点控制点 */}
          <Circle
            x={sourceAnchorPos.x}
            y={sourceAnchorPos.y}
            radius={6}
            fill="white"
            stroke="#007AFF"
            strokeWidth={2}
            draggable
            onDragMove={handleSourceAnchorDrag}
            onDragEnd={handleSourceAnchorDragEnd}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />

          {/* 转折点控制点 */}
          {bendPointPositions.map((pos, index) => (
            <Circle
              key={`bend-${index}`}
              x={pos.x}
              y={pos.y}
              radius={6}
              fill="white"
              stroke="#007AFF"
              strokeWidth={2}
              draggable
              onDragMove={(e) => handleBendPointDrag(index, e)}
              onDragEnd={handleBendPointDragEnd}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
          ))}

          {/* 目标锚点控制点 */}
          <Circle
            x={targetAnchorPos.x}
            y={targetAnchorPos.y}
            radius={6}
            fill="white"
            stroke="#007AFF"
            strokeWidth={2}
            draggable
            onDragMove={handleTargetAnchorDrag}
            onDragEnd={handleTargetAnchorDragEnd}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
        </>
      )}

      {/* 时间间隔标签 - 改进定位和拖拽功能 */}
      {showInterval && (daysDiff !== 0 || constraintOffsetMonths !== undefined) && (() => {
        const labelText = formatInterval();
        // 动态计算文本宽度
        const textWidth = labelText.length * 7 + 8;

        return (
          <Group
            x={labelX + labelOffsetX}
            y={labelY}
            draggable={isSelected}
            dragBoundFunc={(pos) => ({
              x: Math.max(
                labelPositionInfo.minX - 30,
                Math.min(labelPositionInfo.maxX + 30, pos.x)
              ),
              y: labelY  // 锁定 Y 轴
            })}
            onDragEnd={handleLabelDragEnd}
          >
            {/* 动态宽度白色背景 */}
            <Rect
              x={-textWidth / 2}
              y={-2}
              width={textWidth}
              height={16}
              fill="white"
              cornerRadius={3}
            />
            {/* 选中时显示拖拽边框 */}
            {isSelected && (
              <Rect
                x={-textWidth / 2}
                y={-2}
                width={textWidth}
                height={16}
                fill="transparent"
                stroke="#007AFF"
                strokeWidth={1}
                cornerRadius={3}
                dash={[2, 2]}
              />
            )}
            <Text
              text={labelText}
              fontSize={10}
              fill={isConstraintLine ? '#f97316' : isCriticalPath ? '#FF3B30' : '#6b7280'}
              fontStyle={isCriticalPath || isConstraintLine ? 'bold' : 'normal'}
              width={textWidth}
              offsetX={textWidth / 2}
              align="center"
            />
          </Group>
        );
      })()}
    </Group>
  );
};

// 计算箭头顶点
function calculateArrowPoints(linePoints: number[]): number[] {
  const len = linePoints.length;
  if (len < 4) return [];

  // 获取最后一段线的方向
  const endX = linePoints[len - 2];
  const endY = linePoints[len - 1];
  const prevX = linePoints[len - 4];
  const prevY = linePoints[len - 3];

  const angle = Math.atan2(endY - prevY, endX - prevX);
  const arrowLength = 10;

  // 计算箭头三个顶点
  const tipX = endX;
  const tipY = endY;
  const leftX = endX - arrowLength * Math.cos(angle - Math.PI / 6);
  const leftY = endY - arrowLength * Math.sin(angle - Math.PI / 6);
  const rightX = endX - arrowLength * Math.cos(angle + Math.PI / 6);
  const rightY = endY - arrowLength * Math.sin(angle + Math.PI / 6);

  return [tipX, tipY, leftX, leftY, rightX, rightY];
}

export default ConnectionLine;
