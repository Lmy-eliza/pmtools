import { useState, useEffect, useRef, useCallback } from 'react';
import type { Todo } from '../../types';
import { STATUS_CONFIG } from '../../types';
import TodoList from './TodoList';
import NotePanel from '../note/NotePanel';
import MoodPanel from '../note/MoodPanel';
import LiveTimer from '../timer/LiveTimer';
import DateNavigator from '../ui/DateNavigator';
import { formatDuration } from '../../utils/timeUtils';
import type { TimeBlock } from '../../types';
import { feishuApi } from '../../services/feishuApi';
import { useTodoStore } from '../../stores/todoStore';
import { Check, Trash2 } from 'lucide-react';

interface Props {
  date: string;
  todos: Todo[];
  blocks: TimeBlock[];
  dateObj: Date;
  onDateChange: (date: Date) => void;
}

export default function TodoPanel({ date, todos, blocks, dateObj, onDateChange }: Props) {
  // #23: three tabs
  const [activeTab, setActiveTab] = useState<'todo' | 'mood' | 'note'>('todo');

  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration_minutes, 0);
  const completedCount = todos.filter((t) => t.status === 'completed').length;

  // #19: all-time todo progress
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const allTodosFetched = useRef(false);

  useEffect(() => {
    if (!allTodosFetched.current) {
      allTodosFetched.current = true;
      feishuApi.listRecords<Todo>('todo').then(setAllTodos).catch(() => {});
    }
  }, []);

  // BUG-2: 新增/更新待办后 merge 进 allTodos，保证全量计数实时更新
  useEffect(() => {
    if (todos.length === 0) return;
    setAllTodos(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      for (const t of todos) { map.set(t.id, t); }
      return Array.from(map.values());
    });
  }, [todos]);

  const allCompletedCount = allTodos.filter(t => t.status === 'completed').length;

  // 底部统计浮层
  const [todoPopup, setTodoPopup] = useState<'daily' | 'all' | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭浮层
  useEffect(() => {
    if (!todoPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setTodoPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [todoPopup]);

  // 未完成待办列表
  const dailyIncompleteTodos = todos.filter(t => t.status !== 'completed');
  const allIncompleteTodos = allTodos
    .filter(t => t.status !== 'completed')
    .sort((a, b) => b.date.localeCompare(a.date)); // 日期降序，近→远

  // ③ 浮层内完成/删除操作
  const { fetchTodos } = useTodoStore();

  const refetchAllTodos = useCallback(() => {
    feishuApi.listRecords<Todo>('todo').then(setAllTodos).catch(() => {});
  }, []);

  const handlePopupComplete = useCallback(async (todo: Todo) => {
    try {
      await feishuApi.updateRecord('todo', todo._recordId, { status: 'completed' });
      refetchAllTodos();
      fetchTodos(date);
    } catch (e) {
      console.error('完成待办失败:', e);
    }
  }, [date, fetchTodos, refetchAllTodos]);

  const handlePopupDelete = useCallback(async (todo: Todo) => {
    try {
      await feishuApi.deleteRecord('todo', todo._recordId);
      refetchAllTodos();
      fetchTodos(date);
    } catch (e) {
      console.error('删除待办失败:', e);
    }
  }, [date, fetchTodos, refetchAllTodos]);

  return (
    <div className="flex flex-col h-full bg-white/40">
      {/* Tab bar + DateNavigator 合并为一行 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'todo'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 待办
          </button>
          <button
            onClick={() => setActiveTab('mood')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'mood'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            😊 心情
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'note'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 随笔
          </button>
        </div>
        <DateNavigator date={dateObj} onChange={onDateChange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {activeTab === 'todo' ? (
          <TodoList date={date} todos={todos} blocks={blocks} />
        ) : activeTab === 'mood' ? (
          <MoodPanel date={date} />
        ) : (
          <NotePanel date={date} />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Timer */}
      <div className="px-4 py-3">
        <LiveTimer date={date} todos={todos} />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* 底部统计栏：带中文标签 + 浮层 */}
      <div className="relative px-4 py-2.5 flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1">
          📊 当日累计 <strong className="text-gray-600">{formatDuration(totalMinutes)}</strong>
        </span>
        <span className="text-gray-300">·</span>
        <span
          className={`flex items-center gap-1 ${completedCount < todos.length ? 'cursor-pointer hover:text-blue-500 transition-colors' : ''}`}
          onClick={() => { if (completedCount < todos.length) setTodoPopup(todoPopup === 'daily' ? null : 'daily'); }}
        >
          📅 当日待办 {completedCount}/{todos.length}
        </span>
        {allTodos.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span
              className={`flex items-center gap-1 ${allCompletedCount < allTodos.length ? 'cursor-pointer hover:text-blue-500 transition-colors' : ''}`}
              onClick={() => { if (allCompletedCount < allTodos.length) setTodoPopup(todoPopup === 'all' ? null : 'all'); }}
            >
              📋 全量待办 {allCompletedCount}/{allTodos.length}
            </span>
          </>
        )}

        {/* 未完成待办浮层 */}
        {todoPopup && (
          <div
            ref={popupRef}
            className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">
                {todoPopup === 'daily' ? '📅 当日未完成' : '📋 全量未完成'}
              </span>
              <button
                onClick={() => setTodoPopup(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {(todoPopup === 'daily' ? dailyIncompleteTodos : allIncompleteTodos).length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm">🎉 全部完成！</div>
              ) : (
                (todoPopup === 'daily' ? dailyIncompleteTodos : allIncompleteTodos).map(t => (
                  <div key={t.id} className="group/item flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    {todoPopup === 'all' && (
                      <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                        {t.date.slice(5)}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${t.color}15`, color: t.color }}
                    >
                      {t.tag_name}
                    </span>
                    <span className="text-sm text-gray-700 truncate flex-1">{t.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-500 group-hover/item:hidden">
                      {STATUS_CONFIG[t.status].emoji} {STATUS_CONFIG[t.status].label}
                    </span>
                    {/* hover 显示操作按钮 */}
                    <div className="hidden group-hover/item:flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handlePopupComplete(t)}
                        className="p-1 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                        title="完成"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handlePopupDelete(t)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
