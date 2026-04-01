import { useState, useRef } from 'react';
import type { TimeBlock as TimeBlockType } from '../../types';
import { colorToBlockGradient } from '../../utils/colorUtils';
import { formatDuration, timeToPercent, timeToMinutes, minutesToTime } from '../../utils/timeUtils';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import TagPicker from '../todo/TagPicker';
import type { Tag } from '../../types';
import { useTodoStore } from '../../stores/todoStore';

interface Props {
  block: TimeBlockType;
  startHour: number;
  endHour: number;
  onResize: (id: string, newEndTime: string) => void;
  onMove: (id: string, newStartTime: string, newEndTime: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: {
    todo_title?: string; tag_id?: string; tag_name?: string; color?: string;
    start_time?: string; end_time?: string;
  }) => void;
  // #24: drag-follow props (move)
  dragOverrideTop?: number;
  onMoveStart?: (id: string, top: number, height: number) => void;
  onMoveDrag?: (top: number) => void;
  onMoveEnd?: (id: string, newStartTime: string, newEndTime: string) => void;
  // 需求3: resize 本地反馈 props
  resizeOverrideHeight?: number;
  onResizeStart?: (id: string, height: number) => void;
  onResizeDrag?: (height: number) => void;
  onResizeEnd?: (id: string, newEndTime: string) => void;
  // ⑪b: 重叠列位置
  column?: number;
  totalColumns?: number;
}

export default function TimeBlock({
  block,
  startHour,
  endHour,
  onResize,
  onMove,
  onDelete,
  onUpdate,
  dragOverrideTop,
  onMoveStart,
  onMoveDrag,
  onMoveEnd,
  resizeOverrideHeight,
  onResizeStart,
  onResizeDrag,
  onResizeEnd,
  column,
  totalColumns,
}: Props) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 新增-4: 从 store 读取当日待办列表
  const { todos } = useTodoStore();

  // 需求7: 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(block.todo_title);
  const [editTagId, setEditTagId] = useState(block.tag_id);
  const [editTagName, setEditTagName] = useState(block.tag_name);
  const [editColor, setEditColor] = useState(block.color);
  const [editStartTime, setEditStartTime] = useState(block.start_time);
  const [editEndTime, setEditEndTime] = useState(block.end_time);

  const top = timeToPercent(block.start_time, startHour, endHour);
  const bottom = timeToPercent(block.end_time, startHour, endHour);
  const height = bottom - top;

  // 窄块判定：高度 < 3.5%（约 38 分钟以下）
  const isNarrow = height < 3.5;

  // 需求3: resize 使用本地即时反馈
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const parentEl = containerRef.current?.parentElement;
    if (!parentEl) return;
    const parentRect = parentEl.getBoundingClientRect();
    const totalMins = (endHour - startHour) * 60;
    const startMins = startHour * 60;

    // 通知父组件开始 resize
    if (onResizeStart) {
      onResizeStart(block.id, height);
    }

    const onMouseMove = (ev: MouseEvent) => {
      const pct = ((ev.clientY - parentRect.top) / parentRect.height) * 100;
      let newMins = Math.round((pct / 100) * totalMins + startMins);
      // 15分钟对齐
      newMins = Math.round(newMins / 15) * 15;
      const blockStartMins = parseInt(block.start_time.split(':')[0]) * 60 + parseInt(block.start_time.split(':')[1]);
      if (newMins > blockStartMins + 15) {
        const newBottomPct = ((newMins - startMins) / totalMins) * 100;
        const newHeight = newBottomPct - top;
        // 本地即时反馈：只更新视觉高度
        if (onResizeDrag) {
          onResizeDrag(newHeight);
        }
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      setIsResizing(false);
      // 最终计算新的 endTime
      const pct = ((ev.clientY - parentRect.top) / parentRect.height) * 100;
      let newMins = Math.round((pct / 100) * totalMins + startMins);
      newMins = Math.round(newMins / 15) * 15;
      const blockStartMins = parseInt(block.start_time.split(':')[0]) * 60 + parseInt(block.start_time.split(':')[1]);

      if (newMins > blockStartMins + 15) {
        const newH = Math.floor(newMins / 60);
        const newM = newMins % 60;
        const newEndTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        // 松手时才发 API
        if (onResizeEnd) {
          onResizeEnd(block.id, newEndTime);
        } else {
          onResize(block.id, newEndTime);
        }
      } else {
        // 复位
        if (onResizeEnd) {
          onResizeEnd(block.id, block.end_time);
        }
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // #24: Handle move with instant visual feedback
  const handleMoveStart = (e: React.MouseEvent) => {
    if (isResizing || isEditing) return;
    e.preventDefault();
    setIsDragging(true);

    const parentEl = containerRef.current?.parentElement;
    if (!parentEl) return;
    const parentRect = parentEl.getBoundingClientRect();
    const totalMins = (endHour - startHour) * 60;
    const startMins = startHour * 60;
    const blockDuration = block.duration_minutes;
    const offsetY = e.clientY - (containerRef.current?.getBoundingClientRect().top || 0);

    // Notify parent of drag start
    if (onMoveStart && containerRef.current) {
      const elRect = containerRef.current.getBoundingClientRect();
      const topPct = ((elRect.top - parentRect.top) / parentRect.height) * 100;
      onMoveStart(block.id, topPct, height);
    }

    const onMouseMove = (ev: MouseEvent) => {
      const pct = ((ev.clientY - offsetY - parentRect.top) / parentRect.height) * 100;
      // #24: Update visual position instantly via parent
      if (onMoveDrag) {
        onMoveDrag(pct);
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      setIsDragging(false);

      // Calculate final position
      const pct = ((ev.clientY - offsetY - parentRect.top) / parentRect.height) * 100;
      let newStartMins = Math.round((pct / 100) * totalMins + startMins);
      newStartMins = Math.round(newStartMins / 15) * 15;
      const newEndMins = newStartMins + blockDuration;

      if (newStartMins >= startMins && newEndMins <= endHour * 60) {
        const sH = Math.floor(newStartMins / 60);
        const sM = newStartMins % 60;
        const eH = Math.floor(newEndMins / 60);
        const eM = newEndMins % 60;
        const newStart = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
        const newEnd = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

        if (onMoveEnd) {
          onMoveEnd(block.id, newStart, newEnd);
        } else {
          onMove(block.id, newStart, newEnd);
        }
      } else {
        // Reset drag state if out of bounds
        if (onMoveEnd) {
          onMoveEnd(block.id, block.start_time, block.end_time);
        }
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 需求7: 编辑相关
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditTitle(block.todo_title);
    setEditTagId(block.tag_id);
    setEditTagName(block.tag_name);
    setEditColor(block.color);
    setEditStartTime(block.start_time);
    setEditEndTime(block.end_time);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    if (onUpdate) {
      onUpdate(block.id, {
        todo_title: editTitle.trim(),
        tag_id: editTagId,
        tag_name: editTagName,
        color: editColor,
        start_time: editStartTime,
        end_time: editEndTime,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleTagChange = (tag: Tag) => {
    setEditTagId(tag.id);
    setEditTagName(tag.name);
    setEditColor(tag.color);
  };

  // #24: Use dragOverrideTop for visual position if provided
  const displayTop = dragOverrideTop !== undefined ? dragOverrideTop : top;
  // 需求3: Use resizeOverrideHeight for visual height if provided
  const displayHeight = resizeOverrideHeight !== undefined ? resizeOverrideHeight : height;

  // ⑪b: 计算重叠列位置
  const hasOverlap = totalColumns !== undefined && totalColumns > 1 && column !== undefined;
  const leftBase = 56; // left-14 = 56px
  const rightGap = 16; // right-4 = 16px

  return (
    <div
      ref={containerRef}
      data-timeblock="true"
      className={`absolute rounded-xl shadow-sm cursor-move group transition-shadow hover:shadow-md ${
        isEditing
          ? 'overflow-visible z-30 shadow-lg'
          : `overflow-hidden ${isDragging ? 'shadow-lg z-20 opacity-90' : 'z-10'}`
      }`}
      style={{
        top: `${displayTop}%`,
        height: `${Math.max(displayHeight, 2)}%`,
        minHeight: isEditing ? '110px' : undefined,
        background: colorToBlockGradient(isEditing ? editColor : block.color),
        ...(hasOverlap ? {
          left: `calc(${leftBase}px + ${(column! / totalColumns!) * 100}% - ${(column! / totalColumns!) * (leftBase + rightGap)}px)`,
          width: `calc(${100 / totalColumns!}% - ${(leftBase + rightGap) / totalColumns!}px)`,
        } : {
          left: `${leftBase}px`,
          right: `${rightGap}px`,
        }),
      }}
      onMouseDown={handleMoveStart}
    >
      {/* Left color indicator */}
      <div
        className="time-block-indicator"
        style={{ backgroundColor: isEditing ? editColor : block.color }}
      />

      {/* Content */}
      <div className="pl-3 pr-2 py-1.5 h-full flex flex-col justify-between">
        {isEditing ? (
          /* 编辑模式：第一行 下拉选择+勾叉，第二行 TagPicker */
          <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <select
                value={editTitle}
                onChange={(e) => {
                  const selected = todos.find(t => t.title === e.target.value);
                  if (selected) {
                    setEditTitle(selected.title);
                    setEditTagId(selected.tag_id);
                    setEditTagName(selected.tag_name);
                    setEditColor(selected.color);
                  } else {
                    setEditTitle(e.target.value);
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-gray-200 bg-white/90 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value={editTitle}>{editTitle}</option>
                {todos.filter(t => t.title !== editTitle).map(t => (
                  <option key={t.id} value={t.title}>
                    {t.tag_name} - {t.title}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveEdit}
                className="p-1 rounded-lg bg-green-50 hover:bg-green-100 transition-colors shrink-0"
              >
                <Check size={12} className="text-green-600" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={12} className="text-gray-500" />
              </button>
            </div>
            {/* 时间段编辑行 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-500 text-xs">⏰</span>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="px-1.5 py-0.5 rounded-lg border border-gray-200 bg-white/90 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="px-1.5 py-0.5 rounded-lg border border-gray-200 bg-white/90 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              {[60, 90, 120].map(mins => (
                <button
                  key={mins}
                  onClick={() => {
                    const startMins = timeToMinutes(editStartTime);
                    setEditEndTime(minutesToTime(startMins + mins));
                  }}
                  className="px-1.5 py-0.5 rounded-lg bg-gray-100 text-[10px] text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
            <div className="w-full">
              <TagPicker value={editTagId} onChange={handleTagChange} />
            </div>
          </div>
        ) : isNarrow ? (
          /* 窄块单行显示：标题 · 时间段    [编辑][删除] */
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate">
                {block.todo_title}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                · {block.start_time}-{block.end_time}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleStartEdit}
                className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-blue-100/50 transition-all"
              >
                <Pencil size={12} className="text-blue-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-red-100/50 transition-all"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          </div>
        ) : (
          /* 正常显示模式（两行） */
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {block.todo_title}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/50 text-gray-600">
                  {block.tag_name}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {/* 编辑按钮 */}
                <button
                  onClick={handleStartEdit}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-blue-100/50 transition-all"
                >
                  <Pencil size={12} className="text-blue-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 hover:bg-red-100/50 transition-all"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {block.start_time} - {block.end_time} · {formatDuration(block.duration_minutes)}
            </div>
          </>
        )}
      </div>

      {/* Resize handle at bottom */}
      {!isEditing && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/5 transition-colors"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
