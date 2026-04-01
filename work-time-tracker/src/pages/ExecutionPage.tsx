import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import ResizableSplitter from '../components/layout/ResizableSplitter';
import TodoPanel from '../components/todo/TodoPanel';
import DayTimeline from '../components/timeline/DayTimeline';
import PomodoroTimer from '../components/timer/PomodoroTimer';
import { useTodoStore } from '../stores/todoStore';
import { useTimeBlockStore } from '../stores/timeBlockStore';
import { useTimerStore } from '../stores/timerStore';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { useTagStore } from '../stores/tagStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useDateStore } from '../stores/dateStore';
import { formatDate, prevDay, nextDay } from '../utils/dateUtils';
import { minutesToTime, roundToQuarter } from '../utils/timeUtils';
import { useKeyboard } from '../hooks/useKeyboard';
import type { Todo } from '../types';

const START_HOUR = 6;
const END_HOUR = 24;

export default function ExecutionPage() {
  const { executionDate: date, setExecutionDate: setDate } = useDateStore();
  const dateStr = formatDate(date);

  const { todos, fetchTodos, reorderTodos } = useTodoStore();
  const { blocks, fetchBlocks, addBlock } = useTimeBlockStore();
  const { tags, fetchTags, ensurePresets } = useTagStore();
  const { isConfigured } = useSettingsStore();
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);

  // 正计时状态，用于构造 liveBlock
  const { isRunning, seconds, todoId: timerTodoId, startedAt, intervalId: timerIntervalId } = useTimerStore();

  // 番茄钟状态，用于构造 pomodoroLiveBlock
  const {
    phase: pomodoroPhase,
    todoId: pomodoroTodoId,
    focusStartedAt,
    isOvertime,
    overtimeSeconds,
    totalSeconds: pomodoroTotalSeconds,
    remainingSeconds: pomodoroRemainingSeconds,
    intervalId: pomodoroIntervalId,
  } = usePomodoroStore();

  // #27: ghost block state
  const [ghostBlock, setGhostBlock] = useState<{ top: number; height: number; label: string } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch data on date change
  useEffect(() => {
    if (isConfigured) {
      fetchTodos(dateStr);
      fetchBlocks(dateStr);
      if (tags.length === 0) {
        fetchTags().then(() => ensurePresets());
      }
    }
  }, [dateStr, isConfigured]);

  // #26: keyboard shortcuts
  useKeyboard({
    onNewTodo: () => {
      // Focus on new todo button/input - trigger a click on the add button
      const addBtn = document.querySelector('[data-action="new-todo"]') as HTMLButtonElement;
      addBtn?.click();
    },
    onToday: () => setDate(new Date()),
    onPrevDay: () => setDate(prevDay(date)),
    onNextDay: () => setDate(nextDay(date)),
  });

  // 构造正计时实时预览块（每 15 秒更新一次，降低 DayTimeline 重渲染频率）
  const timerLiveBlock = useMemo(() => {
    if (!isRunning || !startedAt || !timerTodoId) return null;
    const todo = todos.find(t => t.id === timerTodoId);
    if (!todo) return null;
    const startTime = `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`;
    const now = new Date(startedAt.getTime() + seconds * 1000);
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isPaused = isRunning && !timerIntervalId;
    return { todo_title: todo.title, color: todo.color, tag_name: todo.tag_name, start_time: startTime, end_time: endTime, isPaused };
  }, [isRunning, startedAt, timerTodoId, timerIntervalId, Math.floor(seconds / 15), todos]);

  // 构造番茄钟实时预览块（专注中时显示）
  const pomodoroLiveBlock = useMemo(() => {
    if (pomodoroPhase !== 'focus' || !focusStartedAt) return null;
    const todo = pomodoroTodoId ? todos.find(t => t.id === pomodoroTodoId) : null;
    const startTime = `${String(focusStartedAt.getHours()).padStart(2, '0')}:${String(focusStartedAt.getMinutes()).padStart(2, '0')}`;
    // 计算已用秒数
    const elapsedSec = isOvertime
      ? pomodoroTotalSeconds + overtimeSeconds
      : pomodoroTotalSeconds - pomodoroRemainingSeconds;
    const now = new Date(focusStartedAt.getTime() + elapsedSec * 1000);
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isPaused = pomodoroPhase !== 'idle' && !pomodoroIntervalId && !(pomodoroRemainingSeconds === 0 && !isOvertime);
    return {
      todo_title: todo?.title || '番茄计时',
      color: todo?.color || '#EF4444',
      tag_name: todo?.tag_name || '未分类',
      start_time: startTime,
      end_time: endTime,
      isPaused,
    };
  }, [pomodoroPhase, pomodoroTodoId, focusStartedAt, isOvertime, overtimeSeconds, pomodoroTotalSeconds, pomodoroIntervalId, Math.floor(pomodoroRemainingSeconds / 15), todos]);

  // 合并 liveBlock：正计时优先，否则显示番茄
  const liveBlock = timerLiveBlock || pomodoroLiveBlock;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data?.current?.type === 'todo') {
      setActiveDragTodo(active.data.current.todo);
    }
  };

  // #27: Show ghost block during drag over timeline
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over } = event;
    if (!over || over.id !== 'timeline-drop' || !activeDragTodo) {
      setGhostBlock(null);
      return;
    }

    const activatorEvent = event.activatorEvent as PointerEvent | undefined;
    const delta = event.delta;
    if (activatorEvent && delta && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const dropY = activatorEvent.clientY + delta.y;
      const relY = dropY - rect.top;
      const totalHeight = rect.height;
      const totalMins = (END_HOUR - START_HOUR) * 60;
      const startMins = roundToQuarter(Math.max(0, (relY / totalHeight) * totalMins + START_HOUR * 60));
      const endMins = startMins + 60;

      const topPx = ((startMins - START_HOUR * 60) / totalMins) * totalHeight;
      const heightPx = (60 / totalMins) * totalHeight;

      setGhostBlock({
        top: topPx,
        height: heightPx,
        label: `${minutesToTime(Math.max(startMins, START_HOUR * 60))} - ${minutesToTime(Math.min(endMins, END_HOUR * 60))}`,
      });
    }
  }, [activeDragTodo]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTodo(null);
    setGhostBlock(null);

    if (!over) return;

    // Reorder within list
    if (over.id !== 'timeline-drop' && active.data?.current?.type === 'todo') {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId !== overId) {
        reorderTodos(activeId, overId);
      }
      return;
    }

    // Drop on timeline
    if (over.id === 'timeline-drop' && activeDragTodo) {
      let startMins: number;

      const activatorEvent = event.activatorEvent as PointerEvent | undefined;
      const delta = event.delta;
      if (activatorEvent && delta && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const dropY = activatorEvent.clientY + delta.y;
        const relY = dropY - rect.top;
        const totalHeight = rect.height;
        const totalMins = (END_HOUR - START_HOUR) * 60;
        startMins = roundToQuarter(Math.max(0, (relY / totalHeight) * totalMins + START_HOUR * 60));
      } else {
        const now = new Date();
        startMins = roundToQuarter(now.getHours() * 60 + now.getMinutes());
      }

      const endMins = startMins + 60;

      await addBlock({
        todo_id: activeDragTodo.id,
        todo_title: activeDragTodo.title,
        tag_id: activeDragTodo.tag_id,
        tag_name: activeDragTodo.tag_name,
        color: activeDragTodo.color,
        date: dateStr,
        start_time: minutesToTime(Math.max(startMins, START_HOUR * 60)),
        end_time: minutesToTime(Math.min(endMins, END_HOUR * 60)),
        source: 'manual',
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {isConfigured ? (
            <ResizableSplitter>
              <TodoPanel date={dateStr} todos={todos} blocks={blocks} dateObj={date} onDateChange={setDate} />
              <div className="relative h-full overflow-y-auto bg-white/20">
                <DayTimeline
                  date={dateStr}
                  blocks={blocks}
                  todos={todos}
                  timelineRef={timelineRef}
                  ghostBlock={ghostBlock}
                  liveBlock={liveBlock}
                />
                <PomodoroTimer date={dateStr} todos={todos} blocks={blocks} />
              </div>
            </ResizableSplitter>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">⚙️</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  请先配置飞书连接
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  前往设置页面配置飞书多维表格凭证
                </p>
                <a
                  href="/settings"
                  className="inline-flex px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
                >
                  前往设置
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragTodo && (
          <div className="drag-overlay bg-white/90 rounded-xl p-3 shadow-xl border border-gray-200/50 max-w-xs">
            <div className="text-sm font-medium text-gray-800">
              {activeDragTodo.title}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {activeDragTodo.tag_name}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
