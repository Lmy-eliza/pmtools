import { useState, useEffect, useCallback } from 'react';
import type { Todo, TimeBlock, Tag } from '../../types';
import { usePomodoroStore } from '../../stores/pomodoroStore';
import { useTimeBlockStore } from '../../stores/timeBlockStore';
import { useTodoStore } from '../../stores/todoStore';
import { useTagStore } from '../../stores/tagStore';
import { formatPomodoroDisplay, getCurrentTime, minutesToTime, timeToMinutes } from '../../utils/timeUtils';
import { suggestTodo } from '../../utils/smartSuggest';
import { Pause, Play, Square, X, Plus } from 'lucide-react';
import TagPicker from '../todo/TagPicker';

interface Props {
  date: string;
  todos: Todo[];
  blocks: TimeBlock[];
}

const PRESETS = [
  { emoji: '🚀', minutes: 25, label: '25' },
  { emoji: '☕', minutes: 35, label: '35' },
  { emoji: '🔥', minutes: 50, label: '50' },
];

export default function PomodoroTimer({ date, todos, blocks }: Props) {
  const {
    phase,
    totalSeconds,
    remainingSeconds,
    todoId,
    intervalId,
    isExpanded,
    isOvertime,
    overtimeSeconds,
    startFocus,
    startBreak,
    pause,
    resume,
    stop,
    toggleExpanded,
    setExpanded,
    setTodoId,
    continueAsTimer,
  } = usePomodoroStore();
  const { addBlock } = useTimeBlockStore();
  const { addTodo } = useTodoStore();
  const { tags } = useTagStore();

  const [selectedTodoId, setSelectedTodoId] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(5);

  // #6: New task creation form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTag, setNewTaskTag] = useState<Tag | null>(null);

  const activeTodos = todos.filter(
    (t) => t.status === 'not_started' || t.status === 'in_progress' || t.status === 'paused'
  );

  // Smart suggest
  const suggestedTodo = suggestTodo(todos, blocks);

  useEffect(() => {
    if (suggestedTodo && !selectedTodoId) {
      setSelectedTodoId(suggestedTodo.id);
    }
  }, [suggestedTodo, selectedTodoId]);

  const handleFocusComplete = useCallback(async () => {
    const elapsed = isOvertime ? totalSeconds + overtimeSeconds : totalSeconds;

    if (elapsed > 60) {
      const todo = todoId ? todos.find((t) => t.id === todoId) : null;

      const now = new Date();
      const endTime = getCurrentTime();
      const startMins = timeToMinutes(endTime) - Math.floor(elapsed / 60);
      const startTime = minutesToTime(Math.max(0, startMins));

      try {
        await addBlock({
          todo_id: todo?.id || '',
          todo_title: todo?.title || '番茄计时',
          tag_id: todo?.tag_id || '',
          tag_name: todo?.tag_name || '未分类',
          color: todo?.color || '#6B7280',
          date,
          start_time: startTime,
          end_time: endTime,
          source: 'pomodoro',
        });
      } catch (e) {
        console.error('保存专注记录失败:', e);
      }
    }
  }, [todos, todoId, totalSeconds, isOvertime, overtimeSeconds, date, addBlock]);

  // Handle focus phase completion
  useEffect(() => {
    if (phase === 'focus' && remainingSeconds === 0 && !intervalId) {
      handleFocusComplete();
    }
  }, [phase, remainingSeconds, intervalId, handleFocusComplete]);

  const handleStartFocus = (minutes: number) => {
    const tid = selectedTodoId || activeTodos[0]?.id || null;
    startFocus(minutes, tid);
  };

  const handleStop = async () => {
    const result = stop();
    if (result && result.seconds > 60) {
      const todo = result.todoId ? todos.find((t) => t.id === result.todoId) : null;

      const endTime = getCurrentTime();
      const startMins = timeToMinutes(endTime) - Math.floor(result.seconds / 60);
      const startTime = minutesToTime(Math.max(0, startMins));
      try {
        await addBlock({
          todo_id: todo?.id || '',
          todo_title: todo?.title || '番茄计时',
          tag_id: todo?.tag_id || '',
          tag_name: todo?.tag_name || '未分类',
          color: todo?.color || '#6B7280',
          date,
          start_time: startTime,
          end_time: endTime,
          source: 'pomodoro',
        });
      } catch (e) {
        alert(`专注记录保存失败: ${e instanceof Error ? e.message : '未知错误'}。\n时间段: ${startTime} - ${endTime}`);
      }
    }
  };

  // #6: Handle switching todo during timer
  const handleSwitchTodo = (newTodoId: string) => {
    if (newTodoId === '__new__') {
      setShowNewTaskForm(true);
      return;
    }
    setTodoId(newTodoId || null);
  };

  // #6: Handle creating new task during timer
  const handleCreateNewTask = async () => {
    if (!newTaskTitle.trim()) return;
    const tag = newTaskTag || (tags.length > 0 ? tags[0] : null);
    if (!tag) return;

    try {
      const newTodo = await addTodo({
        title: newTaskTitle.trim(),
        description: '',
        status: 'in_progress',
        tag_id: tag.id,
        tag_name: tag.name,
        color: tag.color,
        date,
      });
      setTodoId(newTodo.id);
      setNewTaskTitle('');
      setNewTaskTag(null);
      setShowNewTaskForm(false);
    } catch (e) {
      console.error('创建任务失败:', e);
    }
  };

  const currentTodo = todos.find((t) => t.id === todoId);
  const progress = totalSeconds > 0
    ? isOvertime
      ? 100
      : ((totalSeconds - remainingSeconds) / totalSeconds) * 100
    : 0;

  const isPaused = phase !== 'idle' && !intervalId && !(remainingSeconds === 0 && !isOvertime);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleExpanded}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${
          phase === 'focus'
            ? 'bg-gradient-to-br from-red-400 to-rose-500 animate-pulse'
            : phase === 'break'
            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
            : 'bg-gradient-to-br from-amber-400 to-orange-500'
        }`}
      >
        🍅
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="fixed bottom-24 right-6 z-50 w-72 glass-dark rounded-2xl shadow-2xl p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-800">🍅 专注模式</span>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {phase === 'idle' ? (
            <>
              {/* Presets */}
              <div className="flex gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.minutes}
                    onClick={() => handleStartFocus(p.minutes)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 hover:bg-white/80 transition-all text-sm border border-gray-100"
                  >
                    <span className="text-lg">{p.emoji}</span>
                    <span className="font-medium text-gray-700">{p.label}m</span>
                  </button>
                ))}
              </div>

              {/* Custom */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">自定义:</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="分钟"
                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={() => {
                    const m = parseInt(customMinutes);
                    if (m > 0) handleStartFocus(m);
                  }}
                  disabled={!customMinutes || parseInt(customMinutes) <= 0}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-sm font-medium disabled:opacity-50"
                >
                  开始
                </button>
              </div>

              {/* Todo selector */}
              <div className="mb-2">
                <select
                  value={selectedTodoId}
                  onChange={(e) => setSelectedTodoId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">不选任务（直接计时）</option>
                  {activeTodos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tag_name} - {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* #7: Removed suggestion text */}
            </>
          ) : (
            <>
              {/* Progress circle + timer */}
              <div className="text-center mb-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="6"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke={phase === 'focus' ? '#EF4444' : '#10B981'}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="font-mono text-3xl font-bold text-gray-800">
                      {isOvertime
                        ? `+${formatPomodoroDisplay(overtimeSeconds)}`
                        : formatPomodoroDisplay(remainingSeconds)
                      }
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {isOvertime
                    ? '⏱ 加时中'
                    : phase === 'focus'
                    ? '🟢 专注中'
                    : '☕ 休息中'
                  } / {Math.ceil(totalSeconds / 60)}min
                </div>
              </div>

              {/* #6: Current task with switchable dropdown */}
              <div className="mb-4">
                <select
                  value={todoId || ''}
                  onChange={(e) => handleSwitchTodo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">🍅 自由番茄计时</option>
                  {activeTodos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tag_name} - {t.title}
                    </option>
                  ))}
                  <option value="__new__">➕ 新建任务...</option>
                </select>
              </div>

              {/* #6: New task form (shown when __new__ selected) */}
              {showNewTaskForm && (
                <div className="mb-4 p-2 rounded-lg bg-white/60 border border-gray-100 space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="任务名称"
                    className="w-full px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateNewTask();
                      if (e.key === 'Escape') setShowNewTaskForm(false);
                    }}
                  />
                  <TagPicker
                    value={newTaskTag?.id || ''}
                    onChange={setNewTaskTag}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreateNewTask}
                      disabled={!newTaskTitle.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
                    >
                      <Plus size={12} /> 创建并关联
                    </button>
                    <button
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                {/* 倒计时归零且未加时：显示 继续计时/休息/结束 三选 */}
                {phase === 'focus' && remainingSeconds === 0 && !isOvertime ? (
                  <>
                    <button
                      onClick={continueAsTimer}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-sm font-medium"
                    >
                      ⏱ 继续计时
                    </button>
                    <button
                      onClick={() => startBreak(breakMinutes)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-medium"
                    >
                      ☕ 休息
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-medium"
                    >
                      <Square size={14} />
                    </button>
                  </>
                ) : isPaused ? (
                  <>
                    <button
                      onClick={resume}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-medium"
                    >
                      <Play size={14} /> 继续
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-400 to-rose-500 text-white text-sm font-medium"
                    >
                      <Square size={14} /> 结束
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={pause}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium"
                    >
                      <Pause size={14} /> 暂停
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-400 to-rose-500 text-white text-sm font-medium"
                    >
                      <Square size={14} /> 结束
                    </button>
                  </>
                )}
              </div>

              {/* 归零后的休息时长选择（仅在三选模式下显示） */}
              {phase === 'focus' && remainingSeconds === 0 && !isOvertime && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">休息时长:</span>
                  <select
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    className="flex-1 px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-sm"
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
