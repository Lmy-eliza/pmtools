import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, TodoStatus } from '../types';
import { STATUS_ORDER } from '../types';
import { feishuApi } from '../services/feishuApi';
import { dateToTimestampRange } from '../utils/dateUtils';

interface TodoState {
  todos: Todo[];
  loading: boolean;
  fetchTodos: (date: string) => Promise<void>;
  addTodo: (data: Omit<Todo, 'id' | 'created_at'>) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  cycleStatus: (id: string) => Promise<void>;
  getTodoById: (id: string) => Todo | undefined;
  reorderTodos: (activeId: string, overId: string) => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,

  fetchTodos: async (date) => {
    set({ loading: true });
    try {
      const { startTs, endTs } = dateToTimestampRange(date);
      const todos = await feishuApi.listRecords<Todo>('todo', {
        filter: `CurrentValue.[date] >= ${startTs} && CurrentValue.[date] < ${endTs}`,
      });
      set({ todos, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTodo: async (data) => {
    const todo: Todo = {
      ...data,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    try {
      await feishuApi.createRecord('todo', todo);
      set((state) => ({ todos: [...state.todos, todo] }));
      return todo;
    } catch (e) {
      throw e instanceof Error ? e : new Error('添加待办失败');
    }
  },

  updateTodo: async (id, data) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const snapshot = { ...todo };
    // 乐观更新：先更新本地 store，再异步写飞书
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    try {
      await feishuApi.updateRecord('todo', todo._recordId, data);
    } catch (e) {
      // 失败回滚
      set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? snapshot : t)),
      }));
      throw e instanceof Error ? e : new Error('更新待办失败');
    }
  },

  deleteTodo: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    try {
      await feishuApi.deleteRecord('todo', todo._recordId);
      set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('删除待办失败');
    }
  },

  cycleStatus: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const idx = STATUS_ORDER.indexOf(todo.status);
    const nextStatus: TodoStatus = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    await get().updateTodo(id, { status: nextStatus });
  },

  getTodoById: (id) => get().todos.find((t) => t.id === id),

  reorderTodos: (activeId, overId) => {
    const todos = get().todos;
    const oldIndex = todos.findIndex((t) => t.id === activeId);
    const newIndex = todos.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const updated = [...todos];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    set({ todos: updated });
  },
}));
