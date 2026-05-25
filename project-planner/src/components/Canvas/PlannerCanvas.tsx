import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';
import { useCanvasStore } from '../../stores/canvasStore';
import { xToDate, formatDate, formatShortDate, ensureDateOrder, dateToX, generateTimelineUnits, formatTimelineUnit, getUnitWidth } from '../../utils/dateUtils';
import { DiamondNode } from '../Nodes/DiamondNode';
import { TriangleNode } from '../Nodes/TriangleNode';
import { RectangleNode } from '../Nodes/RectangleNode';
import { StarNode } from '../Nodes/StarNode';
import { CircleNode } from '../Nodes/CircleNode';
import { HexagonNode } from '../Nodes/HexagonNode';
import { EmojiNode } from '../Nodes/EmojiNode';
import { PentagonNode } from '../Nodes/PentagonNode';
import { ConnectionLine } from '../Nodes/ConnectionLine';
import { defaultColors } from '../../data/presets';
import { GripVertical, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { PlanNode } from '../../types';

const DEFAULT_LEFT_PANEL_WIDTH = 120;
const MIN_LEFT_PANEL_WIDTH = 80;
const MAX_LEFT_PANEL_WIDTH = 300;
const HEADER_HEIGHT = 60; // 年份行 + 月份行
const MAX_NAME_LENGTH = 30; // 项目名称和泳道名称的最大字符数

export interface PlannerCanvasRef {
  getStage: () => any;
  getContentSize: () => { width: number; height: number; leftPanelWidth: number };
}

interface PlannerCanvasProps {
  isConstraintSelectMode?: boolean;
  onConstraintNodeSelect?: (nodeId: string) => void;
}

export const PlannerCanvas = forwardRef<PlannerCanvasRef, PlannerCanvasProps>(
  ({ isConstraintSelectMode = false, onConstraintNodeSelect }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const swimlaneListRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; date: string } | null>(null);
  const [draggedSwimlane, setDraggedSwimlane] = useState<string | null>(null);
  const [dragOverSwimlane, setDragOverSwimlane] = useState<string | null>(null);
  // 需求15：可拖拽调整左侧面板宽度
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_LEFT_PANEL_WIDTH);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  // 需求23：框选相关状态
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [boxSelectEnd, setBoxSelectEnd] = useState<{ x: number; y: number } | null>(null);
  // 需求3C：悬停信息卡
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; node: PlanNode } | null>(null);

  const {
    projectName,
    setProjectName,
    startDate,
    endDate,
    swimlanes,
    updateSwimlane,
    deleteSwimlane,
    reorderSwimlanes,
    nodes,
    addNode,
    updateNode,
    selectedNodeIds,
    selectNode,
    clearSelection,
    connections,
    selectedConnectionIds,
    selectConnection,
    constraints,
    selectedConstraintId,
    selectConstraint,
    settings,
    currentTool,
    connectionStart,
    setConnectionStart,
    addConnection,
    applyConstraints,
  } = useCanvasStore();

  // 暴露 stageRef 和内容尺寸给父组件用于复制图片功能
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getContentSize: () => {
      // 计算实际内容尺寸
      const view = settings.timelineView || 'month';
      const width = getUnitWidth(view);
      const units = generateTimelineUnits(startDate, endDate, view);
      const timelineWidth = units.length * width;
      const contentHeight = HEADER_HEIGHT + swimlanes.length * settings.swimlaneHeight;
      return {
        width: leftPanelWidth + timelineWidth,
        height: contentHeight,
        leftPanelWidth: leftPanelWidth,
      };
    },
  }), [startDate, endDate, settings, swimlanes, leftPanelWidth]);

  // 计算画布尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 同步左侧泳道列表的垂直滚动
  const handleCanvasScroll = () => {
    if (canvasContainerRef.current && swimlaneListRef.current) {
      swimlaneListRef.current.scrollTop = canvasContainerRef.current.scrollTop;
    }
  };

  // 问题5/9修复：根据时间轴视图类型生成时间单元并计算单位宽度
  const timelineView = settings.timelineView || 'month';
  const unitWidth = getUnitWidth(timelineView);
  const timelineUnits = generateTimelineUnits(startDate, endDate, timelineView);

  // 使用时间单元数量和动态单位宽度计算总宽度（Stage内部不需要加leftPanelWidth，因为Stage已经在右侧区域内）
  const totalWidth = timelineUnits.length * unitWidth;
  const totalHeight = HEADER_HEIGHT + swimlanes.length * settings.swimlaneHeight;

  // 计算今日线位置（Stage内部x从0开始）
  const today = new Date();
  const todayX = dateToX(today, startDate, unitWidth, 0, timelineView);
  const isTodayInRange = today >= startDate && today <= endDate;
  const isTodayBefore = today < startDate;
  const isTodayAfter = today > endDate;
  const daysFromRange = isTodayBefore
    ? differenceInDays(startDate, today)
    : isTodayAfter
      ? differenceInDays(today, endDate)
      : 0;

  // 处理画布点击
  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const rawPos = stage.getPointerPosition();

    if (!rawPos) return;

    // 将屏幕坐标转换为画布逻辑坐标（与 onMouseDown/onMouseMove 一致）
    const pos = { x: rawPos.x / settings.zoom, y: rawPos.y / settings.zoom };

    // 检查是否点击在节点上（节点有自己的点击处理）
    const clickedOnNode = e.target.getParent()?.className === 'Group' &&
                          e.target.getParent()?.attrs?.draggable === true;

    if (clickedOnNode) return;

    // 碰撞检测：用 dateToX 计算节点的实际渲染位置，而非 stale 的 node.x
    const clickedInsideNode = nodes.some(node => {
      const calcX = node.type === 'rectangle'
        ? dateToX(node.date, startDate, unitWidth, 0, timelineView) + (node.width || 100) / 2
        : dateToX(node.date, startDate, unitWidth, 0, timelineView);
      const nodeWidth = node.width || (node.type === 'rectangle' ? 100 : 40);
      const nodeHeight = node.type === 'rectangle' ? 32 : 40;
      return pos.x >= calcX - nodeWidth / 2 &&
             pos.x <= calcX + nodeWidth / 2 &&
             pos.y >= node.y - nodeHeight / 2 &&
             pos.y <= node.y + nodeHeight / 2;
    });

    if (clickedInsideNode) return;

    if (currentTool === 'select') {
      clearSelection();
      setConnectionStart(null);
    } else if (['diamond', 'triangle', 'rectangle', 'star', 'circle', 'hexagon', 'emoji', 'pentagon'].includes(currentTool)) {
      if (pos.x > 0 && pos.y > HEADER_HEIGHT) {
        // 创建模式下先清除选中，避免"近选中节点保护区"阻止后续连续创建
        if (selectedNodeIds.length > 0) {
          clearSelection();
        }

        const swimlaneIndex = Math.floor((pos.y - HEADER_HEIGHT) / settings.swimlaneHeight);
        const swimlane = swimlanes[swimlaneIndex];

        if (swimlane) {
          const nodeType = currentTool as 'diamond' | 'triangle' | 'rectangle' | 'star' | 'circle' | 'hexagon' | 'emoji' | 'pentagon';

          const state = useCanvasStore.getState();

          const defaultWidth = nodeType === 'rectangle' ? unitWidth * 2 : undefined;

          let nodeDate: Date;
          let nodeEndDate: Date | undefined;

          if (nodeType === 'rectangle' && defaultWidth) {
            const leftEdgeX = pos.x - defaultWidth / 2;
            const rightEdgeX = pos.x + defaultWidth / 2;
            nodeDate = xToDate(leftEdgeX, startDate, unitWidth, 0, timelineView);
            nodeEndDate = xToDate(rightEdgeX, startDate, unitWidth, 0, timelineView);
          } else {
            nodeDate = xToDate(pos.x, startDate, unitWidth, 0, timelineView);
          }

          const sameTypeCount = nodes.filter(n => n.type === nodeType).length;
          const getDefaultName = () => {
            switch (nodeType) {
              case 'diamond': return `里程碑${sameTypeCount + 1}`;
              case 'triangle': return `决策点${sameTypeCount + 1}`;
              case 'rectangle': return `活动${sameTypeCount + 1}`;
              case 'star': return `重点${sameTypeCount + 1}`;
              case 'circle': return `节点${sameTypeCount + 1}`;
              case 'hexagon': return `阶段${sameTypeCount + 1}`;
              case 'emoji': return `表情${sameTypeCount + 1}`;
              case 'pentagon': return `G${sameTypeCount}`;
              default: return `节点${sameTypeCount + 1}`;
            }
          };

          addNode({
            type: nodeType,
            name: getDefaultName(),
            color: defaultColors[nodeType] || defaultColors.diamond,
            x: pos.x,
            y: HEADER_HEIGHT + swimlaneIndex * settings.swimlaneHeight + settings.swimlaneHeight / 2,
            date: nodeDate,
            swimlaneId: swimlane.id,
            width: defaultWidth,
            endDate: nodeEndDate,
            emoji: nodeType === 'emoji' ? state.currentEmoji : undefined,
          });
        }
      }
    }
  };

  // 处理节点拖拽（Stage内部x从0开始）
  const handleNodeDrag = (id: string, x: number, y: number) => {
    const node = nodes.find((n) => n.id === id);

    // 问题3修复：长方形节点显示起止日期范围
    if (node && node.type === 'rectangle') {
      const nodeWidth = node.width || 100;
      const leftEdgeX = x - nodeWidth / 2;
      const rightEdgeX = x + nodeWidth / 2;
      const startDateCalc = xToDate(leftEdgeX, startDate, unitWidth, 0, timelineView);
      const endDateCalc = xToDate(rightEdgeX, startDate, unitWidth, 0, timelineView);
      setDragTooltip({
        x,
        y: y - 30,
        date: `${formatDate(startDateCalc)} - ${formatDate(endDateCalc)}`,
      });
    } else {
      const date = xToDate(x, startDate, unitWidth, 0, timelineView);
      setDragTooltip({
        x,
        y: y - 30,
        date: formatDate(date),
      });
    }
  };

  const handleNodeDragEnd = (id: string, x: number, y: number) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    // 计算新的泳道
    const swimlaneIndex = Math.floor((y - HEADER_HEIGHT) / settings.swimlaneHeight);
    const clampedIndex = Math.max(0, Math.min(swimlaneIndex, swimlanes.length - 1));
    const swimlane = swimlanes[clampedIndex];

    const newY = HEADER_HEIGHT + clampedIndex * settings.swimlaneHeight + settings.swimlaneHeight / 2;

    // 长方形节点：根据左右边缘计算起止日期（Stage内部x从0开始）
    if (node.type === 'rectangle') {
      const nodeWidth = node.width || 100;
      const leftEdgeX = x - nodeWidth / 2;
      const rightEdgeX = x + nodeWidth / 2;
      let startDateCalc = xToDate(leftEdgeX, startDate, unitWidth, 0, timelineView);
      let endDateCalc = xToDate(rightEdgeX, startDate, unitWidth, 0, timelineView);

      // 问题3修复：确保日期顺序正确
      [startDateCalc, endDateCalc] = ensureDateOrder(startDateCalc, endDateCalc);

      updateNode(id, {
        x,
        y: newY,
        date: startDateCalc,
        endDate: endDateCalc,
        swimlaneId: swimlane?.id,
      });
    } else {
      // 其他节点：根据中心点计算日期（Stage内部x从0开始）
      const date = xToDate(x, startDate, unitWidth, 0, timelineView);
      updateNode(id, {
        x,
        y: newY,
        date,
        swimlaneId: swimlane?.id,
      });
    }

    // 应用约束
    applyConstraints(id);
    setDragTooltip(null);
  };

  // 处理长方形节点宽度变化（右侧手柄：左边缘保持不动）
  const handleNodeWidthChange = (id: string, newWidth: number, newCenterX: number) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    // 直接使用传入的新中心点位置
    const newX = newCenterX;

    // 计算左边缘（保持不变）和新的右边缘
    const leftEdgeX = newX - newWidth / 2;
    const rightEdgeX = newX + newWidth / 2;

    // 计算起止日期（Stage内部x从0开始）
    let newStartDate = xToDate(leftEdgeX, startDate, unitWidth, 0, timelineView);
    let newEndDate = xToDate(rightEdgeX, startDate, unitWidth, 0, timelineView);

    // 确保日期顺序正确
    [newStartDate, newEndDate] = ensureDateOrder(newStartDate, newEndDate);

    updateNode(id, {
      x: newX,
      width: newWidth,
      date: newStartDate,
      endDate: newEndDate,
    });
  };

  // 处理长方形节点左边缘变化（左侧手柄：右边缘保持不动）
  const handleNodeLeftEdgeChange = (id: string, newWidth: number, newCenterX: number) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    // 直接使用传入的新中心点位置
    const newX = newCenterX;

    // 计算新的左边缘和右边缘（右边缘应该保持不变）
    const leftEdgeX = newX - newWidth / 2;
    const rightEdgeX = newX + newWidth / 2;

    // 计算起止日期（Stage内部x从0开始）
    let newStartDate = xToDate(leftEdgeX, startDate, unitWidth, 0, timelineView);
    let newEndDate = xToDate(rightEdgeX, startDate, unitWidth, 0, timelineView);

    // 确保日期顺序正确
    [newStartDate, newEndDate] = ensureDateOrder(newStartDate, newEndDate);

    updateNode(id, {
      x: newX,
      width: newWidth,
      date: newStartDate,
      endDate: newEndDate,
    });
  };

  // 处理节点点击（用于连线模式和约束选择模式）
  const handleNodeClick = (id: string) => {
    // 约束选择模式优先
    if (isConstraintSelectMode && onConstraintNodeSelect) {
      onConstraintNodeSelect(id);
      return;
    }

    if (currentTool === 'connection') {
      if (connectionStart === null) {
        setConnectionStart(id);
      } else if (connectionStart !== id) {
        addConnection(connectionStart, id, 'solid');
        setConnectionStart(null);
      }
    } else {
      selectNode(id);
    }
  };

  // 泳道拖拽排序处理（问题8）
  const handleDragStart = (e: React.DragEvent, swimlaneId: string) => {
    setDraggedSwimlane(swimlaneId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverSwimlane(targetId);
    if (draggedSwimlane && draggedSwimlane !== targetId) {
      // 重新排序
      const newSwimlanes = [...swimlanes];
      const dragIndex = newSwimlanes.findIndex(s => s.id === draggedSwimlane);
      const targetIndex = newSwimlanes.findIndex(s => s.id === targetId);
      const [removed] = newSwimlanes.splice(dragIndex, 1);
      newSwimlanes.splice(targetIndex, 0, removed);
      reorderSwimlanes(newSwimlanes);
    }
  };

  const handleDragEnd = () => {
    setDraggedSwimlane(null);
    setDragOverSwimlane(null);
  };

  // 泳道删除处理（问题9）
  const handleDeleteSwimlane = (id: string) => {
    const nodeCount = nodes.filter(n => n.swimlaneId === id).length;
    const msg = nodeCount > 0
      ? `确定删除此泳道吗？将同时删除其中的 ${nodeCount} 个节点`
      : '确定删除此泳道吗？';

    if (confirm(msg)) {
      deleteSwimlane(id);
    }
  };

  // 渲染节点 - 动态计算X坐标以支持时间轴视图切换
  const renderNode = (node: PlanNode) => {
    const isSelected = selectedNodeIds.includes(node.id);
    const isConnectionStart = connectionStart === node.id;

    // 问题6修复：根据日期动态计算X坐标（Stage内部x从0开始）
    // 问题5修复（第二轮）：长方形节点使用左边缘日期计算，然后加上宽度的一半得到中心点
    let nodeWithCalculatedX: PlanNode;
    if (node.type === 'rectangle') {
      const leftEdgeX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
      const calculatedX = leftEdgeX + (node.width || 100) / 2;
      nodeWithCalculatedX = { ...node, x: calculatedX };
    } else {
      const calculatedX = dateToX(node.date, startDate, unitWidth, 0, timelineView);
      nodeWithCalculatedX = { ...node, x: calculatedX };
    }

    const commonProps = {
      key: node.id,
      node: nodeWithCalculatedX,
      isSelected,
      isConnectionStart,
      onClick: () => {
        handleNodeClick(node.id);
        // 需求3B：点击置顶 - 找到节点的 Konva Group 并置顶
        const stage = stageRef.current;
        if (stage) {
          const layer = stage.findOne('Layer');
          if (layer) {
            const groups = layer.find('Group');
            const targetGroup = groups.find((g: any) => {
              const pos = g.position();
              return Math.abs(pos.x - nodeWithCalculatedX.x) < 1 && Math.abs(pos.y - nodeWithCalculatedX.y) < 1;
            });
            if (targetGroup) {
              targetGroup.moveToTop();
              layer.batchDraw();
            }
          }
        }
      },
      onDrag: (x: number, y: number) => handleNodeDrag(node.id, x, y),
      onDragEnd: (x: number, y: number) => handleNodeDragEnd(node.id, x, y),
    };

    switch (node.type) {
      case 'diamond':
        return <DiamondNode {...commonProps} />;
      case 'triangle':
        return <TriangleNode {...commonProps} />;
      case 'rectangle':
        return (
          <RectangleNode
            {...commonProps}
            onWidthChange={(newWidth, centerOffset) => handleNodeWidthChange(node.id, newWidth, centerOffset)}
            onLeftEdgeChange={(newWidth, centerOffset) => handleNodeLeftEdgeChange(node.id, newWidth, centerOffset)}
          />
        );
      case 'star':
        return <StarNode {...commonProps} />;
      case 'circle':
        return <CircleNode {...commonProps} />;
      case 'hexagon':
        return <HexagonNode {...commonProps} />;
      case 'pentagon':
        return <PentagonNode {...commonProps} />;
      case 'emoji':
        return <EmojiNode {...commonProps} />;
      default:
        return null;
    }
  };

  // 需求15：处理左侧面板宽度调整
  const handlePanelResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanel(true);
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(MIN_LEFT_PANEL_WIDTH, Math.min(MAX_LEFT_PANEL_WIDTH, startWidth + deltaX));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPanel(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden bg-white relative planner-canvas-container">
      {/* 左侧固定列 - 问题7修复 */}
      <div className="flex-shrink-0 bg-gray-50 overflow-hidden flex flex-col z-20 border-r border-gray-200"
           style={{ width: leftPanelWidth }}>
        {/* 项目名称区域 - 问题4修复：minHeight改为height，确保缩放同步 */}
        <div
          className="border-b border-gray-200 flex items-start justify-center overflow-hidden"
          style={{ height: HEADER_HEIGHT * settings.zoom, padding: '4px 0' }}
        >
          <div
            className="w-full mx-2 flex items-center justify-center relative"
          >
            <textarea
              value={projectName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => {
                setProjectName(e.target.value);
                // 自动调整高度
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              onInput={(e) => {
                // 自动调整高度
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              ref={(el) => {
                // 初始化时调整高度
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              className="editable-text text-sm font-semibold text-center w-full resize-none overflow-hidden"
              style={{
                lineHeight: '1.4',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                fontSize: projectName.length > 20 ? '12px' : '14px',
              }}
              placeholder="项目名称"
              rows={1}
            />
            {/* 字数提示 */}
            {projectName.length >= MAX_NAME_LENGTH && (
              <div className="absolute -bottom-4 left-0 right-0 text-xs text-red-500 text-center">
                已达上限 {MAX_NAME_LENGTH} 字
              </div>
            )}
          </div>
        </div>

        {/* 泳道名称列表 - 与右侧画布同步垂直滚动 */}
        <div
          ref={swimlaneListRef}
          className="flex-1 overflow-hidden"
        >
          {swimlanes.map((swimlane) => (
            <div
              key={swimlane.id}
              draggable
              onDragStart={(e) => handleDragStart(e, swimlane.id)}
              onDragOver={(e) => handleDragOver(e, swimlane.id)}
              onDragEnd={handleDragEnd}
              className={`group relative flex flex-col border-b border-gray-200 px-1 transition-colors ${
                dragOverSwimlane === swimlane.id ? 'bg-blue-50' : ''
              } ${draggedSwimlane === swimlane.id ? 'opacity-50' : ''}`}
              style={{
                height: settings.swimlaneHeight * settings.zoom,
                minHeight: settings.swimlaneHeight * settings.zoom,
              }}
            >
              {/* 上部区域：拖拽手柄和名称 */}
              <div className="flex items-center flex-1">
                {/* 拖拽手柄 */}
                <GripVertical
                  size={14}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-50 cursor-grab mr-1 text-gray-400"
                />

                {/* 名称输入 - 改为 textarea 支持换行 */}
                <div className="relative flex-1 min-w-0">
                  <textarea
                    value={swimlane.name}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(e) => {
                      updateSwimlane(swimlane.id, { name: e.target.value });
                      // 自动调整高度
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, settings.swimlaneHeight * settings.zoom - 20) + 'px';
                    }}
                    className="editable-text text-sm text-center w-full resize-none overflow-hidden min-w-0"
                    style={{
                      lineHeight: '1.3',
                      wordBreak: 'break-all',
                      fontSize: swimlane.name.length > 15 ? '12px' : '14px',
                    }}
                    placeholder="泳道名称"
                    rows={1}
                  />
                  {/* 字数提示 */}
                  {swimlane.name.length >= MAX_NAME_LENGTH && (
                    <div className="absolute -bottom-3 left-0 right-0 text-xs text-red-500 text-center">
                      已达上限
                    </div>
                  )}
                </div>
              </div>

              {/* 删除按钮 - 移到右下角 */}
              <button
                onClick={() => handleDeleteSwimlane(swimlane.id)}
                className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1"
                title="删除泳道"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 需求15：拖拽调整宽度的分隔条 - 使用绝对定位避免间隙 */}
      <div
        className={`absolute w-2 bg-transparent hover:bg-blue-400 cursor-col-resize z-30 transition-colors ${isResizingPanel ? 'bg-blue-500' : ''}`}
        style={{ left: leftPanelWidth - 4, top: 0, bottom: 0 }}
        onMouseDown={handlePanelResizeStart}
        title="拖拽调整宽度"
      />

      {/* 右侧可滚动画布区域 */}
      <div
        ref={canvasContainerRef}
        className="flex-1 overflow-auto relative"
        onScroll={handleCanvasScroll}
      >
        {/* Konva 画布 */}
        <Stage
          ref={stageRef}
          width={Math.max(dimensions.width, totalWidth)}
          height={Math.max(dimensions.height, totalHeight)}
          onClick={handleStageClick}
          onMouseMove={(e) => {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();

            // 需求23：框选移动
            if (isBoxSelecting && pos) {
              setBoxSelectEnd({ x: pos.x / settings.zoom, y: pos.y / settings.zoom });
            }

            // 需求3C：悬停信息卡
            if (!pos) { setHoverTooltip(null); return; }
            const scaledPos = { x: pos.x / settings.zoom, y: pos.y / settings.zoom };
            const hoveredNode = nodes.find(node => {
              const calcX = node.type === 'rectangle'
                ? dateToX(node.date, startDate, unitWidth, 0, timelineView) + (node.width || 100) / 2
                : dateToX(node.date, startDate, unitWidth, 0, timelineView);
              const nodeW = node.width || (node.type === 'rectangle' ? 100 : 40);
              const nodeH = node.type === 'rectangle' ? 32 : 40;
              return scaledPos.x >= calcX - nodeW / 2 && scaledPos.x <= calcX + nodeW / 2
                && scaledPos.y >= node.y - nodeH / 2 && scaledPos.y <= node.y + nodeH / 2;
            });
            if (hoveredNode) {
              setHoverTooltip({ x: pos.x + leftPanelWidth, y: pos.y, node: hoveredNode });
            } else {
              setHoverTooltip(null);
            }
          }}
          onMouseLeave={() => setHoverTooltip(null)}
          onMouseDown={(e) => {
            // 需求23：框选开始
            if (currentTool === 'select') {
              const stage = e.target.getStage();
              const pos = stage?.getPointerPosition();
              if (pos) {
                // 问题4修复：将屏幕坐标除以zoom转换为画布坐标
                const scaledPos = {
                  x: pos.x / settings.zoom,
                  y: pos.y / settings.zoom
                };
                // Stage内部x从0开始，只需检查是否在表头下方
                if (scaledPos.x > 0 && scaledPos.y > HEADER_HEIGHT) {
                  // 检查是否点击在节点上
                  const clickedOnNode = nodes.some(node => {
                    const nodeWidth = node.width || (node.type === 'rectangle' ? 100 : 40);
                    const nodeHeight = node.type === 'rectangle' ? 32 : 40;
                    return scaledPos.x >= node.x - nodeWidth / 2 &&
                           scaledPos.x <= node.x + nodeWidth / 2 &&
                           scaledPos.y >= node.y - nodeHeight / 2 &&
                           scaledPos.y <= node.y + nodeHeight / 2;
                  });
                  if (!clickedOnNode) {
                    setIsBoxSelecting(true);
                    setBoxSelectStart({ x: scaledPos.x, y: scaledPos.y });
                    setBoxSelectEnd({ x: scaledPos.x, y: scaledPos.y });
                  }
                }
              }
            }
          }}
          onMouseUp={() => {
            // 需求23：框选结束
            if (isBoxSelecting && boxSelectStart && boxSelectEnd) {
              // 计算框选区域
              const minX = Math.min(boxSelectStart.x, boxSelectEnd.x);
              const maxX = Math.max(boxSelectStart.x, boxSelectEnd.x);
              const minY = Math.min(boxSelectStart.y, boxSelectEnd.y);
              const maxY = Math.max(boxSelectStart.y, boxSelectEnd.y);

              // 选中框选区域内的所有节点
              const selectedIds = nodes
                .filter(node => {
                  return node.x >= minX && node.x <= maxX &&
                         node.y >= minY && node.y <= maxY;
                })
                .map(node => node.id);

              if (selectedIds.length > 0) {
                useCanvasStore.setState({ selectedNodeIds: selectedIds });
              }
            }
            setIsBoxSelecting(false);
            setBoxSelectStart(null);
            setBoxSelectEnd(null);
          }}
          scaleX={settings.zoom}
          scaleY={settings.zoom}
        >
          <Layer>
            {/* 背景 */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={totalWidth / settings.zoom}
              height={totalHeight / settings.zoom}
              fill="#ffffff"
            />

          {/* 年份表头 - 根据时间轴视图动态生成（Stage内部x从0开始） */}
          {/* 问题6修复：天/周视图按年月分组，月/季视图按年份分组 */}
          {(() => {
            let xOffset = 0;
            const yearElements: React.ReactNode[] = [];

            // 根据时间轴视图决定分组方式
            if (timelineView === 'day' || timelineView === 'week') {
              // 天/周视图：按年月分组
              const yearMonthGroups = new Map<string, Date[]>();
              timelineUnits.forEach(unit => {
                const key = `${unit.getFullYear()}-${String(unit.getMonth() + 1).padStart(2, '0')}`;
                if (!yearMonthGroups.has(key)) {
                  yearMonthGroups.set(key, []);
                }
                yearMonthGroups.get(key)!.push(unit);
              });

              yearMonthGroups.forEach((units, key) => {
                const width = units.length * unitWidth;
                const [year, month] = key.split('-');
                const label = `${year}年${parseInt(month)}月`;
                yearElements.push(
                  <Group key={`yearmonth-${key}`}>
                    <Rect
                      x={xOffset}
                      y={0}
                      width={width}
                      height={30}
                      fill="#f9fafb"
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                    <Text
                      x={xOffset}
                      y={0}
                      width={width}
                      height={30}
                      text={label}
                      fontSize={14}
                      fontStyle="bold"
                      fill="#374151"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                );
                xOffset += width;
              });
            } else {
              // 月/季视图：按年份分组
              const yearUnitGroups = new Map<number, Date[]>();
              timelineUnits.forEach(unit => {
                const year = unit.getFullYear();
                if (!yearUnitGroups.has(year)) {
                  yearUnitGroups.set(year, []);
                }
                yearUnitGroups.get(year)!.push(unit);
              });

              yearUnitGroups.forEach((units, year) => {
                const width = units.length * unitWidth;
                yearElements.push(
                  <Group key={`year-${year}`}>
                    <Rect
                      x={xOffset}
                      y={0}
                      width={width}
                      height={30}
                      fill="#f9fafb"
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                    <Text
                      x={xOffset}
                      y={0}
                      width={width}
                      height={30}
                      text={String(year)}
                      fontSize={14}
                      fontStyle="bold"
                      fill="#374151"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                );
                xOffset += width;
              });
            }

            return yearElements;
          })()}

          {/* 时间单元表头 - 根据timelineView显示不同颗粒度（Stage内部x从0开始） */}
          {timelineUnits.map((unit, index) => {
            const x = index * unitWidth;
            return (
              <Group key={`unit-${index}`}>
                <Rect
                  x={x}
                  y={30}
                  width={unitWidth}
                  height={30}
                  fill="#ffffff"
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <Text
                  x={x}
                  y={30}
                  width={unitWidth}
                  height={30}
                  text={formatTimelineUnit(unit, timelineView)}
                  fontSize={12}
                  fill="#6b7280"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}

          {/* 泳道背景和网格线（Stage内部x从0开始） */}
          {swimlanes.map((swimlane, index) => {
            const y = HEADER_HEIGHT + index * settings.swimlaneHeight;
            return (
              <Group key={`swimlane-bg-${swimlane.id}`}>
                {/* 泳道背景 */}
                <Rect
                  x={0}
                  y={y}
                  width={timelineUnits.length * unitWidth}
                  height={settings.swimlaneHeight}
                  fill={index % 2 === 0 ? '#ffffff' : '#fafafa'}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                {/* 中心轴线 */}
                <Line
                  points={[
                    0,
                    y + settings.swimlaneHeight / 2,
                    timelineUnits.length * unitWidth,
                    y + settings.swimlaneHeight / 2,
                  ]}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  dash={[4, 4]}
                />
              </Group>
            );
          })}

          {/* 时间单元网格线（Stage内部x从0开始） */}
          {timelineUnits.map((_, index) => {
            const x = index * unitWidth;
            return (
              <Line
                key={`grid-${index}`}
                points={[x, HEADER_HEIGHT, x, totalHeight]}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            );
          })}

          {/* 连接线 - 使用动态计算的节点坐标（Stage内部x从0开始） */}
          {connections.map((conn, index) => {
            const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
            const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
            if (!sourceNode || !targetNode) return null;

            // 动态计算节点X坐标（修复：长方形节点使用中心点坐标）
            let sourceX = dateToX(sourceNode.date, startDate, unitWidth, 0, timelineView);
            if (sourceNode.type === 'rectangle') {
              sourceX += (sourceNode.width || 100) / 2;  // 加上宽度的一半得到中心点
            }

            let targetX = dateToX(targetNode.date, startDate, unitWidth, 0, timelineView);
            if (targetNode.type === 'rectangle') {
              targetX += (targetNode.width || 100) / 2;  // 加上宽度的一半得到中心点
            }

            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                sourceNode={{ ...sourceNode, x: sourceX }}
                targetNode={{ ...targetNode, x: targetX }}
                showInterval={settings.showIntervals}
                verticalOffset={index}
                isSelected={selectedConnectionIds.includes(conn.id)}
                onClick={(e?: any) => {
                  if (currentTool === 'select') {
                    // 问题14：支持Ctrl多选
                    const isMulti = e?.evt?.ctrlKey || e?.evt?.metaKey;
                    selectConnection(conn.id, isMulti);
                    clearSelection();  // 取消节点选择
                    selectConstraint(null);  // 取消约束选择
                  }
                }}
              />
            );
          })}

          {/* 约束线（虚线，无箭头，需求7&8）- 问题5修复：显示间隔周期 */}
          {settings.showConstraints &&
            constraints.map((constraint, index) => {
              const sourceNode = nodes.find((n) => n.id === constraint.sourceNodeId);
              const targetNode = nodes.find((n) => n.id === constraint.targetNodeId);
              if (!sourceNode || !targetNode) return null;

              // 动态计算节点X坐标（修复：长方形节点使用中心点坐标）
              let sourceX = dateToX(sourceNode.date, startDate, unitWidth, 0, timelineView);
              if (sourceNode.type === 'rectangle') {
                sourceX += (sourceNode.width || 100) / 2;
              }

              let targetX = dateToX(targetNode.date, startDate, unitWidth, 0, timelineView);
              if (targetNode.type === 'rectangle') {
                targetX += (targetNode.width || 100) / 2;
              }

              // 构造一个模拟的 Connection 对象用于 ConnectionLine
              const constraintAsConnection = {
                id: constraint.id,
                sourceNodeId: constraint.sourceNodeId,
                targetNodeId: constraint.targetNodeId,
                style: 'dashed' as const,
              };

              return (
                <ConnectionLine
                  key={`constraint-${constraint.id}`}
                  connection={constraintAsConnection}
                  sourceNode={{ ...sourceNode, x: sourceX }}
                  targetNode={{ ...targetNode, x: targetX }}
                  showInterval={settings.showIntervals}
                  isConstraintLine={true}
                  verticalOffset={-index - 1}
                  constraintOffsetMonths={constraint.offsetMonths}
                  isSelected={selectedConstraintId === constraint.id}
                  onClick={() => {
                    if (currentTool === 'select') {
                      selectConstraint(constraint.id);
                      clearSelection();
                      selectConnection(null);
                    }
                  }}
                />
              );
            })}

          {/* 节点 */}
          {nodes.map(renderNode)}

          {/* 需求23：框选矩形 */}
          {isBoxSelecting && boxSelectStart && boxSelectEnd && (
            <Rect
              x={Math.min(boxSelectStart.x, boxSelectEnd.x)}
              y={Math.min(boxSelectStart.y, boxSelectEnd.y)}
              width={Math.abs(boxSelectEnd.x - boxSelectStart.x)}
              height={Math.abs(boxSelectEnd.y - boxSelectStart.y)}
              fill="rgba(0, 122, 255, 0.1)"
              stroke="#007AFF"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}

          {/* TODAY 今日线（置于顶层）- 问题10修复：红线从TODAY标签下方开始 */}
          {isTodayInRange && (
            <Group>
              {/* TODAY 标签 */}
              <Group x={todayX} y={10}>
                <Rect
                  x={-25}
                  y={-2}
                  width={50}
                  height={18}
                  fill="#FF3B30"
                  cornerRadius={4}
                />
                <Text
                  text="TODAY"
                  fontSize={10}
                  fill="#ffffff"
                  fontStyle="bold"
                  width={50}
                  offsetX={25}
                  align="center"
                />
              </Group>
              {/* 今日红色垂直线 - 从标签下方开始（y=10+18=28，再留2px间距=30） */}
              <Line
                points={[todayX, 30, todayX, totalHeight]}
                stroke="#FF3B30"
                strokeWidth={2}
              />
            </Group>
          )}

          {/* 今日在范围外时的边缘提示 */}
          {!isTodayInRange && (
            <Group>
              {/* 左侧边缘提示（今日在开始日期之前）- Stage内部x从0开始 */}
              {isTodayBefore && (
                <Group x={5} y={10}>
                  <Rect
                    x={0}
                    y={-2}
                    width={70}
                    height={18}
                    fill="#FF3B30"
                    cornerRadius={4}
                  />
                  <Text
                    text={`← ${daysFromRange}天`}
                    fontSize={10}
                    fill="#ffffff"
                    fontStyle="bold"
                    x={5}
                    width={60}
                    align="left"
                  />
                </Group>
              )}
              {/* 右侧边缘提示（今日在结束日期之后） */}
              {isTodayAfter && (
                <Group x={totalWidth - 75} y={10}>
                  <Rect
                    x={0}
                    y={-2}
                    width={70}
                    height={18}
                    fill="#FF3B30"
                    cornerRadius={4}
                  />
                  <Text
                    text={`${daysFromRange}天 →`}
                    fontSize={10}
                    fill="#ffffff"
                    fontStyle="bold"
                    x={5}
                    width={60}
                    align="right"
                  />
                </Group>
              )}
            </Group>
          )}
        </Layer>
      </Stage>

      {/* 需求22：拖拽时的日期提示固定在页面居中位置 */}
      {dragTooltip && (
        <div
          className="fixed left-1/2 top-20 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium"
        >
          📅 {dragTooltip.date}
        </div>
      )}

      {/* 需求3C：悬停信息卡 */}
      {hoverTooltip && (
        <div
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none text-xs"
          style={{
            left: hoverTooltip.x + 12,
            top: hoverTooltip.y - 10,
            maxWidth: 200,
          }}
        >
          <div className="font-semibold text-gray-800">{hoverTooltip.node.name}</div>
          <div className="text-gray-500 mt-0.5">
            {formatShortDate(hoverTooltip.node.date)}
            {hoverTooltip.node.endDate && ` - ${formatShortDate(hoverTooltip.node.endDate)}`}
          </div>
          <div className="text-gray-400 mt-0.5">
            {swimlanes.find(s => s.id === hoverTooltip.node.swimlaneId)?.name || ''}
          </div>
        </div>
      )}
      </div>
    </div>
  );
});

export default PlannerCanvas;
