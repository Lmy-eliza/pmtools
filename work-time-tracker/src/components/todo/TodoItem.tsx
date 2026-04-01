import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo, TodoStatus } from '../../types';
import { GripVertical, Trash2, Play, Pause, Square, Pencil, Check } from 'lucide-react';
import { colorToGradient } from '../../utils/colorUtils';
import { formatDuration, formatTimerDisplay } from '../../utils/timeUtils';
import StatusBadge from './StatusBadge';
import TagPicker from './TagPicker';
import type { Tag } from '../../types';
import { useTagStore } from '../../stores/tagStore';

interface Props {
  todo: Todo;
  onCycleStatus: () => void;
  onStatusChange: (status: TodoStatus) => void;
  onDelete: () => void;
  onUpdate?: (data: Partial<Todo>) => void;
  minutes?: number;
  startedAt?: number; // #3: timestamp when current session started
}

export default function TodoItem({ todo, onCycleStatus, onStatusChange, onDelete, onUpdate, minutes, startedAt }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, data: { type: 'todo', todo } });
  const { tags } = useTagStore();

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editTag, setEditTag] = useState<Tag | null>(null);

  // #3: live elapsed seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setEditTitle(todo.title);
    const tag = tags.find(t => t.id === todo.tag_id);
    setEditTag(tag || null);
  }, [todo.title, todo.tag_id, tags]);

  // #3: Real-time elapsed timer when startedAt is provided
  useEffect(() => {
    if (startedAt) {
      // Calculate initial elapsed
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [startedAt]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // #8: Only keep completing animation, remove start/pause animations
  const handleStatusChange = (newStatus: TodoStatus) => {
    onStatusChange(newStatus);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    const updates: Partial<Todo> = {};
    if (editTitle.trim() !== todo.title) updates.title = editTitle.trim();
    if (editTag && editTag.id !== todo.tag_id) {
      updates.tag_id = editTag.id;
      updates.tag_name = editTag.name;
      updates.color = editTag.color;
    }
    if (Object.keys(updates).length > 0 && onUpdate) {
      onUpdate(updates);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    const tag = tags.find(t => t.id === todo.tag_id);
    setEditTag(tag || null);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') handleCancelEdit();
  };

  const isCompleted = todo.status === 'completed';
  const isInProgress = todo.status === 'in_progress';

  // #3/#5/#25: Calculate display time
  // Total accumulated seconds = (completed blocks minutes * 60) + (current session elapsed)
  const totalAccumulatedSeconds = ((minutes ?? 0) * 60) + (startedAt ? elapsedSeconds : 0);
  const hasTime = totalAccumulatedSeconds > 0 || isInProgress;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl p-3 card-hover ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 rounded-xl opacity-40"
        style={{ background: colorToGradient(todo.color) }}
      />

      {/* Left color bar */}
      <div
        className="time-block-indicator rounded-l-xl"
        style={{ backgroundColor: todo.color }}
      />

      <div className="relative flex items-start gap-2">
        {/* Drag handle */}
        <button
          className="mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} className="text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          {/* #5: Title row */}
          <div className="flex items-center justify-between gap-2">
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="flex-1 px-2 py-1 rounded-lg border border-blue-300 bg-white/90 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                autoFocus
              />
            ) : (
              <div
                className={`text-base font-medium text-gray-800 break-words ${
                  isCompleted ? 'line-through text-gray-400' : ''
                }`}
              >
                {todo.title}
              </div>
            )}
          </div>

          {/* Description */}
          {todo.description && !isEditing && (
            <div className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap break-words">
              {todo.description}
            </div>
          )}

          {/* Tag + 操作按钮 + 累计时长（合并为一行） */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {isEditing ? (
              <div className="flex-1">
                {/* #2b: removed autoOpen to avoid re-render jitter */}
                <TagPicker
                  value={editTag?.id || todo.tag_id}
                  onChange={setEditTag}
                />
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${todo.color}15`,
                  color: todo.color,
                }}
              >
                {todo.tag_name}
              </span>
            )}
            {/* StatusBadge 彩色状态标签 */}
            {!isEditing && (
              <StatusBadge status={todo.status} onClick={onCycleStatus} size="sm" />
            )}
            {/* 操作按钮：紧跟标签后 */}
            {!isEditing && (
              <>
                {todo.status === 'not_started' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-full text-blue-500 hover:bg-blue-50 transition-all"
                    title="开始"
                  >
                    <Play size={14} />
                  </button>
                )}
                {todo.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('paused')}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-full text-amber-500 hover:bg-amber-50 transition-all"
                      title="暂停"
                    >
                      <Pause size={14} />
                    </button>
                    <button
                      onClick={() => handleStatusChange('completed')}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-full text-green-600 hover:bg-green-50 transition-all"
                      title="完成"
                    >
                      <Square size={14} fill="currentColor" />
                    </button>
                  </>
                )}
                {todo.status === 'paused' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('in_progress')}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-full text-blue-500 hover:bg-blue-50 transition-all"
                      title="继续"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleStatusChange('completed')}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-full text-green-600 hover:bg-green-50 transition-all"
                      title="完成"
                    >
                      <Square size={14} fill="currentColor" />
                    </button>
                  </>
                )}
                {todo.status === 'completed' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-full text-blue-400 hover:bg-blue-50 transition-all opacity-60"
                    title="重新开始"
                  >
                    <Play size={14} />
                  </button>
                )}
              </>
            )}
            {/* 累计时间 */}
            {!isEditing && hasTime && (
              <span
                className={`ml-auto text-sm font-mono whitespace-nowrap flex-shrink-0 ${
                  isInProgress && startedAt
                    ? 'text-blue-500 status-pulse font-medium'
                    : 'text-gray-400'
                }`}
              >
                {isInProgress && startedAt
                  ? formatTimerDisplay(totalAccumulatedSeconds)
                  : formatDuration(minutes ?? 0)
                }
              </span>
            )}
          </div>
        </div>

        {/* Edit + Delete buttons */}
        <div className="flex items-center gap-0.5">
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 transition-all"
              title="保存"
            >
              <Check size={14} />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:opacity-100 transition-all"
              title="编辑"
            >
              <Pencil size={14} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={onDelete}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-red-50 transition-all"
            title="删除"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
