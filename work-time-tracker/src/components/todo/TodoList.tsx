import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Todo, Tag, TimeBlock, TodoStatus } from '../../types';
import { useTodoStore } from '../../stores/todoStore';
import { useTagStore } from '../../stores/tagStore';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';
import { Plus, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  date: string;
  todos: Todo[];
  blocks?: TimeBlock[];
}

export default function TodoList({ date, todos, blocks = [] }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastTag, setLastTag] = useState<Tag | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { addTodo, cycleStatus, deleteTodo, updateTodo } = useTodoStore();
  const { tags } = useTagStore();

  // #20: tag filter
  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  // #21: collapse completed
  const [collapsedCompleted, setCollapsedCompleted] = useState(true);

  // 需求5: collapse incomplete (进行中折叠)
  const [collapsedIncomplete, setCollapsedIncomplete] = useState(false);

  // #3: track when each todo was started (for live timer)
  const [activeStartMap, setActiveStartMap] = useState<Map<string, number>>(new Map());

  // #20: filtered todos
  const filteredTodos = useMemo(() => {
    if (!filterTagId) return todos;
    return todos.filter(t => t.tag_id === filterTagId);
  }, [todos, filterTagId]);

  // Sort: completed items go to the bottom
  const sortedTodos = useMemo(() => {
    const incomplete = filteredTodos.filter(t => t.status !== 'completed');
    const completed = filteredTodos.filter(t => t.status === 'completed');
    return [...incomplete, ...completed];
  }, [filteredTodos]);

  const completedCount = filteredTodos.filter(t => t.status === 'completed').length;
  const incompleteCount = filteredTodos.length - completedCount;

  // #20: get unique tags from current todos
  const usedTags = useMemo(() => {
    const tagIds = new Set(todos.map(t => t.tag_id));
    return tags.filter(t => tagIds.has(t.id));
  }, [todos, tags]);

  const handleAdd = async (data: {
    title: string;
    description: string;
    tag_id: string;
    tag_name: string;
    color: string;
    date?: string;
  }) => {
    setIsSubmitting(true);
    setAddError('');
    try {
      await addTodo({
        ...data,
        status: 'not_started',
        date: data.date || date,
      });
      if (!continuousMode) {
        setShowForm(false);
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '添加待办失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCycleStatus = async (id: string) => {
    try {
      await cycleStatus(id);
    } catch (e) {
      console.error('切换状态失败:', e);
    }
  };

  // #4: single task mutex + #3: activeStartMap management
  const handleStatusChange = useCallback(async (id: string, status: TodoStatus) => {
    try {
      if (status === 'in_progress') {
        // #4: Pause any currently in_progress tasks
        const inProgressTodos = todos.filter(t => t.status === 'in_progress' && t.id !== id);
        for (const t of inProgressTodos) {
          await updateTodo(t.id, { status: 'paused' });
          // Remove from activeStartMap
          setActiveStartMap(prev => {
            const next = new Map(prev);
            next.delete(t.id);
            return next;
          });
        }
        // #3: Record start time
        setActiveStartMap(prev => {
          const next = new Map(prev);
          next.set(id, Date.now());
          return next;
        });
      } else {
        // #3: Remove from activeStartMap when paused/completed
        setActiveStartMap(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
      await updateTodo(id, { status });
    } catch (e) {
      console.error('切换状态失败:', e);
    }
  }, [todos, updateTodo]);

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  // 轻量化删除确认：3秒无操作自动取消
  useEffect(() => {
    if (!pendingDeleteId) return;
    const timer = setTimeout(() => setPendingDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingDeleteId]);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteTodo(pendingDeleteId);
    } catch (e) {
      console.error('删除待办失败:', e);
    }
    setPendingDeleteId(null);
  };

  const handleUpdate = async (id: string, data: Partial<Todo>) => {
    try {
      await updateTodo(id, data);
    } catch (e) {
      console.error('更新待办失败:', e);
    }
  };

  // Compute per-todo minutes from blocks
  const todoMinutesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of blocks) {
      if (b.todo_id) {
        map.set(b.todo_id, (map.get(b.todo_id) || 0) + b.duration_minutes);
      }
    }
    return map;
  }, [blocks]);

  // #21: split sorted todos into incomplete and completed
  const incompleteTodos = sortedTodos.filter(t => t.status !== 'completed');
  const completedTodos = sortedTodos.filter(t => t.status === 'completed');

  return (
    <div className="space-y-2">
      {/* 需求6: 标签筛选 + 新建按钮 合并为一行 */}
      {!showForm && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* 标签筛选 pills */}
          <button
            onClick={() => setFilterTagId(null)}
            className={`px-2 py-0.5 rounded-lg text-xs transition-all ${
              filterTagId === null
                ? 'ring-2 ring-blue-300 bg-blue-50 text-blue-600 font-medium'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            全部
          </button>
          {usedTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
              className={`px-2 py-0.5 rounded-lg text-xs transition-all ${
                filterTagId === tag.id
                  ? 'ring-2 ring-blue-300 bg-blue-50 text-blue-600 font-medium'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tag.emoji} {tag.name}
            </button>
          ))}

          {/* 新建待办按钮推到右侧 */}
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors px-2 py-0.5"
          >
            <Plus size={16} />
            新建待办
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
          {addError && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertCircle size={12} />
              {addError}
            </div>
          )}
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-300"
              />
              连续添加
            </label>
          </div>
          <TodoForm
            date={date}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            submitting={isSubmitting}
            defaultTag={lastTag}
            onSubmitWithTag={(tag) => setLastTag(tag)}
          />
        </div>
      )}

      {/* List */}
      <SortableContext
        items={sortedTodos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {/* 需求5: 进行中折叠分栏按钮 */}
          {incompleteCount > 0 && (
            <button
              onClick={() => setCollapsedIncomplete(!collapsedIncomplete)}
              className="flex items-center gap-2 py-2 px-2 w-full hover:bg-gray-50/50 rounded-lg transition-colors"
            >
              {collapsedIncomplete ? (
                <ChevronRight size={14} className="text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-400" />
              )}
              <div className="flex-1 border-t border-gray-200/60" />
              <span className="text-xs text-gray-400">
                进行中 ({incompleteCount})
              </span>
              <div className="flex-1 border-t border-gray-200/60" />
            </button>
          )}

          {/* Incomplete todos (collapsible) */}
          {!collapsedIncomplete && incompleteTodos.map((todo) => (
            <div key={todo.id}>
              <TodoItem
                todo={todo}
                onCycleStatus={() => handleCycleStatus(todo.id)}
                onStatusChange={(status) => handleStatusChange(todo.id, status)}
                onDelete={() => handleDelete(todo.id)}
                onUpdate={(data) => handleUpdate(todo.id, data)}
                minutes={todoMinutesMap.get(todo.id)}
                startedAt={activeStartMap.get(todo.id)}
              />
              {/* 行内轻量删除确认 */}
              {pendingDeleteId === todo.id && (
                <div className="flex items-center justify-end gap-2 px-3 py-1.5 mt-1 rounded-xl bg-red-50/80 border border-red-200/60">
                  <span className="text-xs text-red-500 mr-auto">确认删除该待办？</span>
                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-2.5 py-1 rounded-lg text-xs text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* #21: Collapsible completed section */}
          {completedCount > 0 && (
            <button
              onClick={() => setCollapsedCompleted(!collapsedCompleted)}
              className="flex items-center gap-2 py-2 px-2 w-full hover:bg-gray-50/50 rounded-lg transition-colors"
            >
              {collapsedCompleted ? (
                <ChevronRight size={14} className="text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-400" />
              )}
              <div className="flex-1 border-t border-gray-200/60" />
              <span className="text-xs text-gray-400">
                已完成 ({completedCount})
              </span>
              <div className="flex-1 border-t border-gray-200/60" />
            </button>
          )}

          {/* Completed todos (collapsible) */}
          {!collapsedCompleted && completedTodos.map((todo) => (
            <div key={todo.id}>
              <TodoItem
                todo={todo}
                onCycleStatus={() => handleCycleStatus(todo.id)}
                onStatusChange={(status) => handleStatusChange(todo.id, status)}
                onDelete={() => handleDelete(todo.id)}
                onUpdate={(data) => handleUpdate(todo.id, data)}
                minutes={todoMinutesMap.get(todo.id)}
                startedAt={activeStartMap.get(todo.id)}
              />
              {/* 行内轻量删除确认 */}
              {pendingDeleteId === todo.id && (
                <div className="flex items-center justify-end gap-2 px-3 py-1.5 mt-1 rounded-xl bg-red-50/80 border border-red-200/60">
                  <span className="text-xs text-red-500 mr-auto">确认删除该待办？</span>
                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-2.5 py-1 rounded-lg text-xs text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>

      {/* Empty state */}
      {filteredTodos.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-400 text-sm">
          <div className="text-3xl mb-2">📋</div>
          <div>{filterTagId ? '该标签下没有待办事项' : '还没有待办事项'}</div>
          <div className="text-xs mt-1">点击「+ 新建待办」开始</div>
        </div>
      )}

    </div>
  );
}
