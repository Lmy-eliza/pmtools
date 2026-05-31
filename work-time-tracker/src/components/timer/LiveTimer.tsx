import { useState } from 'react';
import type { Todo, Tag } from '../../types';
import { useTimerStore } from '../../stores/timerStore';
import { useTodoStore } from '../../stores/todoStore';
import { useTimeBlockStore } from '../../stores/timeBlockStore';
import { useTagStore } from '../../stores/tagStore';
import { formatTimerDisplay } from '../../utils/timeUtils';
import { Play, Pause, Square } from 'lucide-react';
import TagPicker from '../todo/TagPicker';

interface Props {
  date: string;
  todos: Todo[];
}

export default function LiveTimer({ date, todos }: Props) {
  const { isRunning, seconds, todoId, intervalId, start, stop, pause, resume, setTodoId } = useTimerStore();
  const { addBlock } = useTimeBlockStore();
  const { addTodo } = useTodoStore();
  const { tags } = useTagStore();
  const [selectedTodoId, setSelectedTodoId] = useState('');

  // 新建任务表单
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTag, setNewTaskTag] = useState<Tag | null>(null);

  const activeTodos = todos.filter(
    (t) => t.status === 'not_started' || t.status === 'in_progress' || t.status === 'paused'
  );

  // 判断是否暂停：isRunning 但 interval 已清除
  const isPaused = isRunning && !intervalId;

  const handleStart = () => {
    const tid = selectedTodoId || activeTodos[0]?.id;
    if (tid) {
      start(tid);
      setSelectedTodoId(tid);
      // 自动改状态为进行中
      const todo = todos.find(t => t.id === tid);
      if (todo && (todo.status === 'not_started' || todo.status === 'paused')) {
        useTodoStore.getState().updateTodo(tid, { status: 'in_progress' });
      }
    }
  };

  const handleStop = async () => {
    const result = stop();
    if (result && result.seconds > 60) {
      const todo = todos.find((t) => t.id === result.todoId);
      if (todo) {
        const startTime = `${String(result.startedAt.getHours()).padStart(2, '0')}:${String(result.startedAt.getMinutes()).padStart(2, '0')}`;
        const endDate = new Date(result.startedAt.getTime() + result.seconds * 1000);
        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        try {
          await addBlock({
            todo_id: todo.id,
            todo_title: todo.title,
            tag_id: todo.tag_id,
            tag_name: todo.tag_name,
            color: todo.color,
            date,
            start_time: startTime,
            end_time: endTime,
            source: 'timer',
          });
        } catch (e) {
          alert(`计时数据保存失败: ${e instanceof Error ? e.message : '未知错误'}。\n时间段: ${startTime} - ${endTime}`);
        }
      }
    }
  };

  // 计时中切换待办
  const handleSwitchTodo = (newTodoId: string) => {
    if (newTodoId === '__new__') {
      setShowNewTaskForm(true);
      return;
    }
    setTodoId(newTodoId || null);
  };

  // 计时中新建任务
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 待办选择器：计时中可切换 */}
        <select
          value={isRunning ? todoId || '' : selectedTodoId}
          onChange={(e) => {
            if (isRunning) {
              handleSwitchTodo(e.target.value);
            } else {
              setSelectedTodoId(e.target.value);
            }
          }}
          className="flex-1 min-w-[120px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-sm truncate focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">选择待办...</option>
          {activeTodos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tag_name} - {t.title}
            </option>
          ))}
          {isRunning && <option value="__new__">➕ 新建任务...</option>}
        </select>

        {/* 时间显示 */}
        <span className={`font-mono text-sm shrink-0 ${isRunning ? (isPaused ? 'text-amber-500 font-bold' : 'text-blue-600 font-bold') : 'text-gray-400'}`}>
          {formatTimerDisplay(seconds)}
        </span>

        {/* 按钮组 */}
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedTodoId && activeTodos.length === 0}
            className="flex items-center justify-center gap-1 shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-medium hover:shadow-md transition-all disabled:opacity-50"
          >
            <Play size={12} /> 开始
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            {isPaused ? (
              <button
                onClick={resume}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-medium hover:shadow-md transition-all"
              >
                <Play size={12} /> 继续
              </button>
            ) : (
              <button
                onClick={pause}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium hover:shadow-md transition-all"
              >
                <Pause size={12} /> 暂停
              </button>
            )}
            <button
              onClick={handleStop}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-400 to-rose-500 text-white text-xs font-medium hover:shadow-md transition-all"
            >
              <Square size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 新建任务表单（计时中选择"新建"时显示） */}
      {showNewTaskForm && (
        <div className="p-2 rounded-lg bg-white/60 border border-gray-100 space-y-2">
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
          <TagPicker value={newTaskTag?.id || ''} onChange={setNewTaskTag} />
          <div className="flex gap-1">
            <button
              onClick={handleCreateNewTask}
              disabled={!newTaskTitle.trim()}
              className="flex-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
            >
              创建并关联
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
    </div>
  );
}
