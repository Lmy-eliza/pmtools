import { useRef, useCallback, useState, useEffect, useMemo, type RefObject } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { TimeBlock as TimeBlockType, Todo } from '../../types';
import { useTimeBlockStore } from '../../stores/timeBlockStore';
import TimeGrid from './TimeGrid';
import CurrentTimeLine from './CurrentTimeLine';
import TimeBlock from './TimeBlock';
import { minutesToTime, timeToMinutes, roundToQuarter, timeToPercent } from '../../utils/timeUtils';
import { Plus, Minus } from 'lucide-react';

interface LiveBlockData {
  todo_title: string;
  color: string;
  tag_name: string;
  start_time: string;
  end_time: string;
  isPaused?: boolean;
}

interface Props {
  date: string;
  blocks: TimeBlockType[];
  todos?: Todo[];
  timelineRef?: RefObject<HTMLDivElement | null>;
  ghostBlock?: { top: number; height: number; label: string } | null; // #27: ghost block for drag preview
  liveBlock?: LiveBlockData | null; // 实时计时预览块
}

const START_HOUR = 6;
const END_HOUR = 24;
const PX_PER_HOUR_MIN = 40;
const PX_PER_HOUR_MAX = 160;
const PX_PER_HOUR_DEFAULT = 80;

// 重叠分组算法：扫描线法，按 start_time 排序 → 检测重叠 → 分组 → 组内分配列号
function computeOverlapLayout(blocks: TimeBlockType[]): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>();
  if (blocks.length === 0) return result;

  // 按 start_time 排序
  const sorted = [...blocks].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // 分组：检测重叠
  const groups: TimeBlockType[][] = [];
  let currentGroup: TimeBlockType[] = [sorted[0]];
  let groupEnd = timeToMinutes(sorted[0].end_time);

  for (let i = 1; i < sorted.length; i++) {
    const startMins = timeToMinutes(sorted[i].start_time);
    if (startMins < groupEnd) {
      // 有重叠，加入当前组
      currentGroup.push(sorted[i]);
      groupEnd = Math.max(groupEnd, timeToMinutes(sorted[i].end_time));
    } else {
      // 无重叠，开始新组
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
      groupEnd = timeToMinutes(sorted[i].end_time);
    }
  }
  groups.push(currentGroup);

  // 组内分配列号
  for (const group of groups) {
    const totalColumns = group.length;
    group.forEach((block, idx) => {
      result.set(block.id, { column: idx, totalColumns });
    });
  }

  return result;
}

export default function DayTimeline({ date, blocks, todos = [], timelineRef, ghostBlock, liveBlock }: Props) {
  const localRef = useRef<HTMLDivElement>(null);
  const containerRef = timelineRef || localRef;
  const { updateBlock, deleteBlock, addBlock } = useTimeBlockStore();
  const { setNodeRef } = useDroppable({ id: 'timeline-drop' });

  // ⑪c: 缩放控制
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR_DEFAULT);

  // #24: drag state for real-time block movement
  const [dragState, setDragState] = useState<{
    blockId: string;
    top: number;
    height: number;
  } | null>(null);

  // 需求3: resize drag state for real-time resize feedback
  const [resizeDragState, setResizeDragState] = useState<{
    blockId: string;
    height: number;
  } | null>(null);

  const handleResize = useCallback(
    async (id: string, newEndTime: string) => {
      try {
        await updateBlock(id, { end_time: newEndTime });
      } catch (e) {
        console.error('调整时间块失败:', e);
      }
    },
    [updateBlock]
  );

  // 需求3: resize 本地即时反馈
  const handleResizeStart = useCallback(
    (id: string, height: number) => {
      setResizeDragState({ blockId: id, height });
    },
    []
  );

  const handleResizeDrag = useCallback(
    (height: number) => {
      setResizeDragState(prev => prev ? { ...prev, height } : null);
    },
    []
  );

  const handleResizeEnd = useCallback(
    async (id: string, newEndTime: string) => {
      setResizeDragState(null);
      try {
        await updateBlock(id, { end_time: newEndTime });
      } catch (e) {
        console.error('调整时间块失败:', e);
      }
    },
    [updateBlock]
  );

  // #24: optimistic move with drag state
  const handleMoveStart = useCallback(
    (id: string, startTop: number, startHeight: number) => {
      setDragState({ blockId: id, top: startTop, height: startHeight });
    },
    []
  );

  const handleMoveDrag = useCallback(
    (top: number) => {
      setDragState(prev => prev ? { ...prev, top } : null);
    },
    []
  );

  const handleMoveEnd = useCallback(
    async (id: string, newStart: string, newEnd: string) => {
      setDragState(null);
      try {
        await updateBlock(id, { start_time: newStart, end_time: newEnd });
      } catch (e) {
        console.error('移动时间块失败:', e);
      }
    },
    [updateBlock]
  );

  const handleMove = useCallback(
    async (id: string, newStart: string, newEnd: string) => {
      try {
        await updateBlock(id, { start_time: newStart, end_time: newEnd });
      } catch (e) {
        console.error('移动时间块失败:', e);
      }
    },
    [updateBlock]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBlock(id);
      } catch (e) {
        console.error('删除时间块失败:', e);
      }
    },
    [deleteBlock]
  );

  // 需求7: 编辑时间块（标题、标签）
  const handleBlockUpdate = useCallback(
    async (id: string, data: { todo_title?: string; tag_id?: string; tag_name?: string; color?: string; start_time?: string; end_time?: string }) => {
      try {
        await updateBlock(id, data);
      } catch (e) {
        console.error('更新时间块失败:', e);
      }
    },
    [updateBlock]
  );

  // 单击空白区域创建时间块 - mini 表单
  const [quickAdd, setQuickAdd] = useState<{
    startTime: string;
    endTime: string;
    top: number;
    showNewInput?: boolean;
  } | null>(null);
  const [quickTodoId, setQuickTodoId] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const quickFormRef = useRef<HTMLDivElement>(null);

  const totalHeight = (END_HOUR - START_HOUR) * pxPerHour;

  // 点击外部 / ESC 关闭 quickAdd
  useEffect(() => {
    if (!quickAdd) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickAdd(null);
    };
    const handleClick = (e: MouseEvent) => {
      if (quickFormRef.current && !quickFormRef.current.contains(e.target as Node)) {
        setQuickAdd(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    // 延迟绑定避免当前 click 事件触发关闭
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      clearTimeout(timer);
    };
  }, [quickAdd]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // 排除点击在已有时间块上
      if ((e.target as HTMLElement).closest('[data-timeblock]')) return;
      // 排除点击在 quickAdd 表单上
      if ((e.target as HTMLElement).closest('[data-quickadd]')) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.parentElement?.scrollTop || 0;
      const y = e.clientY - rect.top + scrollTop;
      const totalMins = START_HOUR * 60 + (y / totalHeight) * (END_HOUR - START_HOUR) * 60;
      const snapped = Math.round(totalMins / 15) * 15;
      const startH = Math.floor(snapped / 60);
      const startM = snapped % 60;
      const endSnapped = snapped + 30;
      const endH = Math.floor(endSnapped / 60);
      const endM = endSnapped % 60;
      setQuickAdd({
        startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
        endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
        top: y,
      });
      setQuickTodoId('');
      setQuickTitle('');
    },
    [containerRef, totalHeight]
  );

  const handleQuickAddConfirm = useCallback(async () => {
    if (!quickAdd) return;
    const selectedTodo = quickTodoId ? todos.find(t => t.id === quickTodoId) : null;
    if (!selectedTodo && !quickTitle.trim()) return;

    try {
      await addBlock({
        todo_id: selectedTodo?.id || '',
        todo_title: selectedTodo?.title || quickTitle.trim(),
        tag_id: selectedTodo?.tag_id || '',
        tag_name: selectedTodo?.tag_name || '未分类',
        color: selectedTodo?.color || '#6B7280',
        date,
        start_time: quickAdd.startTime,
        end_time: quickAdd.endTime,
        source: 'manual',
      });
    } catch (e) {
      console.error('创建时间块失败:', e);
    }
    setQuickAdd(null);
  }, [quickAdd, quickTodoId, quickTitle, todos, date, addBlock]);

  // ⑪a: 重叠分组计算
  const overlapLayout = useMemo(() => computeOverlapLayout(blocks), [blocks]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="relative bg-white/30"
      style={{ height: totalHeight }}
      onClick={handleTimelineClick}
    >
      {/* ⑪c: 缩放控制按钮 */}
      <div className="sticky top-2 right-2 z-50 flex items-center gap-1 float-right mr-2 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); setPxPerHour(prev => Math.max(PX_PER_HOUR_MIN, prev - 20)); }}
          className="p-1 rounded-lg bg-white/80 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="缩小"
        >
          <Minus size={14} className="text-gray-500" />
        </button>
        <span className="text-[10px] text-gray-400 font-mono min-w-[32px] text-center">{pxPerHour}px</span>
        <button
          onClick={(e) => { e.stopPropagation(); setPxPerHour(prev => Math.min(PX_PER_HOUR_MAX, prev + 20)); }}
          className="p-1 rounded-lg bg-white/80 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="放大"
        >
          <Plus size={14} className="text-gray-500" />
        </button>
      </div>

      <TimeGrid startHour={START_HOUR} endHour={END_HOUR} />
      <CurrentTimeLine startHour={START_HOUR} endHour={END_HOUR} />

      {blocks.map((block) => {
        // #24: If this block is being dragged, override its position
        const isDragged = dragState?.blockId === block.id;
        // 需求3: If this block is being resized, override its height
        const isResized = resizeDragState?.blockId === block.id;
        // ⑪b: 重叠列位置
        const overlap = overlapLayout.get(block.id);
        return (
          <TimeBlock
            key={block.id}
            block={block}
            startHour={START_HOUR}
            endHour={END_HOUR}
            onResize={handleResize}
            onMove={handleMove}
            onDelete={handleDelete}
            onUpdate={handleBlockUpdate}
            dragOverrideTop={isDragged ? dragState.top : undefined}
            onMoveStart={handleMoveStart}
            onMoveDrag={handleMoveDrag}
            onMoveEnd={handleMoveEnd}
            resizeOverrideHeight={isResized ? resizeDragState.height : undefined}
            onResizeStart={handleResizeStart}
            onResizeDrag={handleResizeDrag}
            onResizeEnd={handleResizeEnd}
            column={overlap?.column}
            totalColumns={overlap?.totalColumns}
          />
        );
      })}

      {/* 实时计时预览块：虚线边框 + 脉冲动画（暂停时无脉冲） */}
      {liveBlock && (() => {
        const topPct = timeToPercent(liveBlock.start_time, START_HOUR, END_HOUR);
        const bottomPct = timeToPercent(liveBlock.end_time, START_HOUR, END_HOUR);
        const heightPct = Math.max(bottomPct - topPct, 1);
        return (
          <div
            className={`absolute left-14 right-4 rounded-xl border-2 border-dashed z-[15] pointer-events-none ${liveBlock.isPaused ? '' : 'animate-pulse'}`}
            style={{ top: `${topPct}%`, height: `${heightPct}%`, borderColor: liveBlock.color, background: `${liveBlock.color}15` }}
          >
            <div className="pl-3 py-1">
              <span className="text-xs font-medium" style={{ color: liveBlock.color }}>
                {liveBlock.isPaused ? '⏸' : '⏱'} {liveBlock.todo_title}
              </span>
            </div>
          </div>
        );
      })()}

      {/* #27: Ghost block for drag preview */}
      {ghostBlock && (
        <div
          className="absolute left-14 right-4 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 z-30 pointer-events-none flex items-center justify-center"
          style={{
            top: ghostBlock.top,
            height: ghostBlock.height,
          }}
        >
          <span className="text-xs text-blue-500 font-medium">{ghostBlock.label}</span>
        </div>
      )}

      {/* 单击空白创建时间块 - 紧凑表单 */}
      {quickAdd && (
        <div
          ref={quickFormRef}
          data-quickadd="true"
          className="absolute left-14 right-4 z-40 bg-white rounded-xl shadow-xl border border-blue-200 p-3 space-y-2"
          style={{ top: quickAdd.top }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Row 1: 时间段 + 快捷时长按钮 */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-500">⏰</span>
            <input
              type="time"
              value={quickAdd.startTime}
              onChange={(e) => setQuickAdd(prev => prev ? { ...prev, startTime: e.target.value } : null)}
              className="px-1.5 py-0.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-gray-400">-</span>
            <input
              type="time"
              value={quickAdd.endTime}
              onChange={(e) => setQuickAdd(prev => prev ? { ...prev, endTime: e.target.value } : null)}
              className="px-1.5 py-0.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {/* 快捷时长按钮 */}
            {[60, 90, 120].map(mins => (
              <button
                key={mins}
                onClick={() => {
                  if (!quickAdd) return;
                  const startMins = timeToMinutes(quickAdd.startTime);
                  const endMins = Math.min(startMins + mins, END_HOUR * 60);
                  setQuickAdd(prev => prev ? { ...prev, endTime: minutesToTime(endMins) } : null);
                }}
                className="px-2 py-0.5 rounded-lg bg-gray-100 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </button>
            ))}
          </div>
          {/* Row 2: 待办选择（含新建选项） + 确认/取消 */}
          <div className="flex items-center gap-2">
            <select
              value={quickTodoId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__new__') {
                  setQuickTodoId('');
                  setQuickAdd(prev => prev ? { ...prev, showNewInput: true } : null);
                } else {
                  setQuickTodoId(val);
                  setQuickAdd(prev => prev ? { ...prev, showNewInput: false } : null);
                  if (val) setQuickTitle('');
                }
              }}
              className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">选择待办...</option>
              {todos.filter(t => t.status !== 'completed').map(t => (
                <option key={t.id} value={t.id}>
                  {t.tag_name} - {t.title}
                </option>
              ))}
              <option value="__new__">➕ 新建...</option>
            </select>
            <button
              onClick={handleQuickAddConfirm}
              disabled={!quickTodoId && !quickTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors shrink-0"
            >
              ✓
            </button>
            <button
              onClick={() => setQuickAdd(null)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
          {/* Row 3: 新建输入框（选了"新建"才显示） */}
          {quickAdd.showNewInput && !quickTodoId && (
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddConfirm(); }}
              placeholder="输入任务名..."
              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  );
}
